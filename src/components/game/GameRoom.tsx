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
        console.log('Loading room data for room:', roomId, 'with user:', user.id);
        
        // Load room
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomError) {
          console.error('Room load error:', roomError);
          throw roomError;
        }
        
        console.log('Room loaded successfully:', roomData);
        setRoom(roomData);

        // Load or create game
        let { data: gameData, error: gameLoadError } = await supabase
          .from('games')
          .select('*')
          .eq('room_id', roomId)
          .maybeSingle();

        if (gameLoadError) {
          console.error('Game load error:', gameLoadError);
          throw gameLoadError;
        }

        if (!gameData) {
          console.log('No game found, creating new game for room:', roomId);
          const { data: newGame, error: gameError } = await supabase
            .from('games')
            .insert({
              room_id: roomId,
              status: 'waiting'
            })
            .select()
            .single();

          if (gameError) {
            console.error('Game creation error:', gameError);
            throw gameError;
          }
          gameData = newGame;
        }
        
        console.log('Game loaded/created successfully:', gameData);
        setGame(gameData);

        // Join as player - enhanced guest support
        const displayName = user.user_metadata?.display_name || user.email || 'Gæst';
        const userId = user.id;
        const isGuest = userId.startsWith('guest_');
        
        console.log('Attempting to join room as player:', { 
          userId, 
          displayName, 
          isGuest,
          roomId 
        });

        // Check if player already exists
        const { data: existingPlayer, error: checkError } = await supabase
          .from('players')
          .select('*')
          .eq('user_id', userId)
          .eq('room_id', roomId)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing player:', checkError);
        }

        if (existingPlayer) {
          console.log('Player already exists:', existingPlayer);
        } else {
          // Create new player with better error handling for guests
          const playerData = {
            user_id: userId,
            room_id: roomId,
            name: displayName,
            lives: 3,
            is_alive: true
          };

          console.log('Creating new player with data:', playerData);

          const { data: newPlayer, error: playerError } = await supabase
            .from('players')
            .insert(playerData)
            .select()
            .single();

          if (playerError) {
            console.error('Player creation error:', {
              error: playerError,
              code: playerError.code,
              message: playerError.message,
              details: playerError.details,
              hint: playerError.hint,
              playerData
            });
            
            // More specific error messages for different error types
            if (playerError.code === '23505') {
              toast({
                title: "Du er allerede i spillet",
                description: "Du deltager allerede i dette spil",
                variant: "default",
              });
            } else if (playerError.code === '23503') {
              toast({
                title: "Rum ikke fundet",
                description: "Dette spillerum eksisterer ikke længere",
                variant: "destructive",
              });
            } else {
              toast({
                title: isGuest ? "Gæst kunne ikke tilmeldes" : "Kunne ikke tilmelde",
                description: `Fejl: ${playerError.message}. Du kan stadig se spillet.`,
                variant: "destructive",
              });
            }
          } else {
            console.log('New player created successfully:', newPlayer);
            toast({
              title: "Velkommen til spillet!",
              description: `Du deltager nu som ${displayName}`,
              variant: "default",
            });
          }
        }

        loadPlayers();
      } catch (error: any) {
        console.error('Error loading room:', error);
        toast({
          title: "Fejl",
          description: error.message || "Kunne ikke indlæse rummet",
          variant: "destructive",
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    const loadPlayers = async () => {
      console.log('Loading players for room:', roomId);
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId)
        .order('joined_at');

      if (!error && data) {
        console.log('Players loaded:', data);
        setPlayers(data);
      } else if (error) {
        console.error('Error loading players:', error);
      }
    };

    loadRoomData();

    // Set up real-time subscriptions
    const gameChannel = supabase
      .channel(`game_${roomId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'games', filter: `room_id=eq.${roomId}` },
        (payload) => {
          console.log('Game update received:', payload);
          if (payload.eventType === 'UPDATE') {
            setGame(payload.new as Game);
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        (payload) => {
          console.log('Players update received:', payload);
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

    // Use improved syllable selection
    const { selectRandomSyllable } = await import('@/utils/syllableSelection');
    const randomSyllable = await selectRandomSyllable(room.difficulty);
    
    if (!randomSyllable) {
      toast({
        title: "Fejl",
        description: "Kunne ikke vælge startstavelse",
        variant: "destructive",
      });
      return;
    }

    const firstPlayer = alivePlayers[0];
    
    // More varied timer duration
    const timerDuration = Math.floor(Math.random() * 11) + 10; // 10-20 seconds
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

  const handleWordSubmit = async (word: string): Promise<boolean> => {
    if (!game || !user) return false;
    gameLogic.setCurrentWord(word);
    return await gameLogic.submitWord();
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
