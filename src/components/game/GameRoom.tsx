
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { BombTimer } from './BombTimer';
import { PlayerList } from './PlayerList';
import { WordInput } from './WordInput';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

type Room = Tables<'rooms'>;
type Game = Tables<'games'>;
type Player = Tables<'players'>;

export const GameRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId || !user) return;

    const loadRoomData = async () => {
      try {
        // Load room
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomError) throw roomError;
        setRoom(roomData);

        // Load or create game
        let { data: gameData } = await supabase
          .from('games')
          .select('*')
          .eq('room_id', roomId)
          .single();

        if (!gameData) {
          const { data: newGame, error: gameError } = await supabase
            .from('games')
            .insert({
              room_id: roomId,
              status: 'waiting'
            })
            .select()
            .single();

          if (gameError) throw gameError;
          gameData = newGame;
        }
        setGame(gameData);

        // Join as player
        const displayName = user.user_metadata?.display_name || user.email || 'Anonym';
        
        const { error: playerError } = await supabase
          .from('players')
          .upsert({
            user_id: user.id,
            room_id: roomId,
            name: displayName,
            lives: 3,
            is_alive: true
          }, {
            onConflict: 'user_id, room_id'
          });

        if (playerError) throw playerError;

        loadPlayers();
      } catch (error: any) {
        console.error('Error loading room:', error);
        toast({
          title: "Fejl",
          description: "Kunne ikke indlæse rummet",
          variant: "destructive",
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    const loadPlayers = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId)
        .order('joined_at');

      if (!error && data) {
        setPlayers(data);
      }
    };

    loadRoomData();

    // Set up real-time subscriptions
    const gameChannel = supabase
      .channel(`game_${roomId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'games', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setGame(payload.new as Game);
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        () => {
          loadPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [roomId, user, navigate, toast]);

  // Timer logic
  useEffect(() => {
    if (!game?.timer_end_time) return;

    const interval = setInterval(() => {
      const endTime = new Date(game.timer_end_time!).getTime();
      const now = new Date().getTime();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      
      setTimeLeft(remaining);

      if (remaining === 0) {
        // Timer expired - handle bomb explosion
        handleTimerExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.timer_end_time]);

  const handleTimerExpired = async () => {
    if (!game?.current_player_id) return;

    // Remove life from current player
    const currentPlayer = players.find(p => p.id === game.current_player_id);
    if (currentPlayer) {
      const newLives = currentPlayer.lives - 1;
      const isStillAlive = newLives > 0;

      await supabase
        .from('players')
        .update({ 
          lives: newLives,
          is_alive: isStillAlive
        })
        .eq('id', currentPlayer.id);

      toast({
        title: "💥 Bomben eksploderede!",
        description: `${currentPlayer.name} mistede et liv`,
        variant: "destructive",
      });

      // Move to next player
      nextTurn();
    }
  };

  const nextTurn = async () => {
    if (!game) return;

    const alivePlayers = players.filter(p => p.is_alive);
    
    // For single player, just continue with the same player
    if (alivePlayers.length === 1) {
      const player = alivePlayers[0];
      
      // If they have no lives left, end the game
      if (player.lives <= 0) {
        await supabase
          .from('games')
          .update({ status: 'finished' })
          .eq('id', game.id);
        return;
      }
      
      // Continue with same player for solo play
      startNewRound(player.id);
      return;
    }

    // Multi-player logic
    if (alivePlayers.length <= 1) {
      // Game over
      await supabase
        .from('games')
        .update({ status: 'finished' })
        .eq('id', game.id);
      return;
    }

    const currentIndex = alivePlayers.findIndex(p => p.id === game.current_player_id);
    const nextIndex = (currentIndex + 1) % alivePlayers.length;
    const nextPlayer = alivePlayers[nextIndex];

    startNewRound(nextPlayer.id);
  };

  const startNewRound = async (playerId: string) => {
    if (!game || !room) return;

    // Get random syllable based on difficulty
    const { data: syllables } = await supabase
      .from('syllables')
      .select('syllable')
      .eq('difficulty', room.difficulty)
      .gte('word_count', getDifficultyThreshold(room.difficulty));

    const randomSyllable = syllables?.[Math.floor(Math.random() * syllables.length)]?.syllable || 'ing';

    // Set timer (10-25 seconds)
    const timerDuration = Math.floor(Math.random() * 16) + 10;
    const timerEndTime = new Date(Date.now() + timerDuration * 1000);

    await supabase
      .from('games')
      .update({
        current_player_id: playerId,
        current_syllable: randomSyllable,
        timer_end_time: timerEndTime.toISOString(),
        timer_duration: timerDuration
      })
      .eq('id', game.id);
  };

  const getDifficultyThreshold = (difficulty: string) => {
    switch (difficulty) {
      case 'let': return 500;
      case 'mellem': return 300;
      case 'svaer': return 100;
      default: return 300;
    }
  };

  const handleWordSubmit = async (word: string) => {
    if (!game || !user) return;

    // Check if word was already used
    if (game.used_words?.includes(word)) {
      toast({
        title: "Allerede brugt",
        description: "Dette ord er allerede blevet brugt",
        variant: "destructive",
      });
      return;
    }

    // Validate word (simplified - in production use proper Danish dictionary)
    const { data: validWord } = await supabase
      .from('danish_words')
      .select('word')
      .eq('word', word)
      .single();

    if (!validWord) {
      toast({
        title: "Ikke fundet i ordbogen",
        description: "Dette ord findes ikke i ordbogen",
        variant: "destructive",
      });
      return;
    }

    // Add word to used words
    const updatedUsedWords = [...(game.used_words || []), word];
    
    await supabase
      .from('games')
      .update({ used_words: updatedUsedWords })
      .eq('id', game.id);

    toast({
      title: "Godt ord!",
      description: `"${word}" blev accepteret`,
    });

    // Move to next turn
    nextTurn();
  };

  const startGame = async () => {
    if (!game || !room) return;

    const alivePlayers = players.filter(p => p.is_alive);
    if (alivePlayers.length < 1) {
      toast({
        title: "Ingen spillere",
        description: "Der skal være mindst 1 spiller for at starte",
        variant: "destructive",
      });
      return;
    }

    // Start with first player
    const firstPlayer = alivePlayers[0];
    
    // Get random syllable
    const { data: syllables } = await supabase
      .from('syllables')
      .select('syllable')
      .eq('difficulty', room.difficulty)
      .gte('word_count', getDifficultyThreshold(room.difficulty));

    const randomSyllable = syllables?.[Math.floor(Math.random() * syllables.length)]?.syllable || 'ing';

    const timerDuration = Math.floor(Math.random() * 16) + 10;
    const timerEndTime = new Date(Date.now() + timerDuration * 1000);

    await supabase
      .from('games')
      .update({
        status: 'playing',
        current_player_id: firstPlayer.id,
        current_syllable: randomSyllable,
        timer_end_time: timerEndTime.toISOString(),
        timer_duration: timerDuration,
        round_number: 1,
        used_words: []
      })
      .eq('id', game.id);
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Indlæser...</div>;
  }

  if (!room || !game) {
    return <div className="flex justify-center items-center min-h-screen">Rummet blev ikke fundet</div>;
  }

  const currentPlayer = players.find(p => p.id === game.current_player_id);
  const isCurrentUser = currentPlayer?.user_id === user?.id;
  const alivePlayers = players.filter(p => p.is_alive);
  const isSinglePlayer = players.length === 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{room.name}</h1>
          <p className="text-gray-600">
            Vanskelighed: {room.difficulty} | Rum: {roomId}
            {isSinglePlayer && <span className="ml-2 text-blue-600">• Solo træning</span>}
          </p>
        </div>

        {game.status === 'waiting' ? (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-semibold">
              {isSinglePlayer ? "Klar til solo træning!" : "Venter på at spillet starter..."}
            </h2>
            <PlayerList players={players} currentUserId={user?.id} />
            {(room.creator_id === user?.id || isSinglePlayer) && (
              <Button onClick={startGame} size="lg" className="text-lg px-8 py-3">
                {isSinglePlayer ? "Start træning" : "Start Spil"}
              </Button>
            )}
          </div>
        ) : game.status === 'playing' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="text-center">
                <BombTimer
                  timeLeft={timeLeft}
                  totalTime={game.timer_duration || 15}
                  isActive={game.status === 'playing'}
                  syllable={game.current_syllable || ''}
                />
              </div>

              <div className="text-center space-y-4">
                {currentPlayer && (
                  <p className="text-xl font-semibold">
                    {isCurrentUser ? 
                      (isSinglePlayer ? "Find et ord!" : "Din tur!") : 
                      `${currentPlayer.name}s tur`
                    }
                  </p>
                )}
                
                <WordInput
                  onSubmit={handleWordSubmit}
                  disabled={!isCurrentUser || timeLeft <= 0}
                  currentSyllable={game.current_syllable || ''}
                />

                {game.used_words && game.used_words.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-2">Brugte ord:</h3>
                    <div className="flex flex-wrap gap-2">
                      {game.used_words.map((word, index) => (
                        <span key={index} className="bg-gray-200 px-2 py-1 rounded text-sm">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <PlayerList 
                players={players} 
                currentPlayerId={game.current_player_id || undefined}
                currentUserId={user?.id}
              />
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold">
              {isSinglePlayer ? "Træning afsluttet!" : "Spillet er slut!"}
            </h2>
            {alivePlayers.length === 1 && !isSinglePlayer && (
              <p className="text-xl">🎉 {alivePlayers[0].name} vandt! 🎉</p>
            )}
            {isSinglePlayer && (
              <p className="text-xl">Du brugte {game.used_words?.length || 0} ord i din træning!</p>
            )}
            <PlayerList players={players} currentUserId={user?.id} />
            <Button onClick={() => navigate('/')} className="mt-4">
              Tilbage til forsiden
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
