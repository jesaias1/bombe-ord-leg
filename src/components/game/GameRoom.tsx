import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { GameHeader } from './GameHeader';
import { GameWaiting } from './GameWaiting';
import { GamePlaying } from './GamePlaying';
import { GameFinished } from './GameFinished';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useGameLogic } from '@/hooks/useGameLogic';
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
  const [loading, setLoading] = useState(true);

  const gameLogic = useGameLogic(game, players, user?.id, room);
  const timeLeft = useGameTimer(game, gameLogic.handleTimerExpired);

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
        
        // For guest users, we'll insert with a special user_id pattern
        const userId = 'isGuest' in user && user.isGuest ? user.id : user.id;
        
        const { error: playerError } = await supabase
          .from('players')
          .upsert({
            user_id: userId,
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

    const firstPlayer = alivePlayers[0];
    
    const { data: syllables } = await supabase
      .from('syllables')
      .select('syllable')
      .eq('difficulty', room.difficulty)
      .gte('word_count', 10);

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

  const handleWordSubmit = async (word: string) => {
    if (!game || !user) return;
    gameLogic.setCurrentWord(word);
    await gameLogic.submitWord();
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
  const canStartGame = room.creator_id === user?.id || isSinglePlayer;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        <GameHeader 
          roomName={room.name}
          roomId={roomId!}
          difficulty={room.difficulty}
          isSinglePlayer={isSinglePlayer}
        />

        {game.status === 'waiting' && (
          <GameWaiting
            isSinglePlayer={isSinglePlayer}
            players={players}
            currentUserId={user?.id}
            canStartGame={canStartGame}
            onStartGame={startGame}
          />
        )}

        {game.status === 'playing' && (
          <GamePlaying
            game={game}
            players={players}
            timeLeft={timeLeft}
            currentPlayer={currentPlayer}
            isCurrentUser={isCurrentUser}
            isSinglePlayer={isSinglePlayer}
            currentUserId={user?.id}
            onWordSubmit={handleWordSubmit}
            isSubmitting={gameLogic.isSubmitting}
          />
        )}

        {game.status === 'finished' && (
          <GameFinished
            isSinglePlayer={isSinglePlayer}
            alivePlayers={alivePlayers}
            players={players}
            game={game}
            currentUserId={user?.id}
            onBackHome={() => navigate('/')}
          />
        )}
      </div>
    </div>
  );
};
