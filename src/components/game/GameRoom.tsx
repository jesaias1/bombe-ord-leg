
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GameHeader } from './GameHeader';
import { GameWaiting } from './GameWaiting';
import { GamePlaying } from './GamePlaying';
import { GameFinished } from './GameFinished';
import { QuickWordImport } from '../admin/QuickWordImport';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useTimerHandler } from '@/hooks/useTimerHandler';
import { useAuth } from '@/components/auth/AuthProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { selectRandomSyllable } from '@/utils/syllableSelection';
import { Tables } from '@/integrations/supabase/types';
import { useIsMobile } from '@/hooks/use-mobile';

type Room = Tables<'rooms'>;
type Game = Tables<'games'>;
type Player = Tables<'players'>;

export const GameRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, isGuest } = useAuth();
  const isMobile = useIsMobile();

  const { data: room, isLoading: roomLoading, error: roomError } = useQuery({
    queryKey: ['room', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle();
      if (error) throw error;
      return data as Room | null;
    },
    enabled: !!roomId,
  });

  const { data: game, isLoading: gameLoading } = useQuery({
    queryKey: ['game', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Game | null;
    },
    enabled: !!roomId,
  });

  const { data: players = [], isLoading: playersLoading } = useQuery({
    queryKey: ['players', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId)
        .order('joined_at');
      if (error) throw error;
      return data as Player[];
    },
    enabled: !!roomId,
  });

  // Ensure current user is added as a player when they enter the room
  useEffect(() => {
    if (!user || !roomId || !room || playersLoading) return;
    
    console.log('Checking players for user:', user.id, 'Players:', players);
    const currentUserPlayer = players.find(p => p.user_id === user.id);
    
    if (!currentUserPlayer) {
      console.log('Adding current user as player to room. User ID:', user.id, 'Type:', typeof user.id);
      
      // Get the proper display name for both authenticated and guest users
      let displayName = 'Anonymous';
      
      if (isGuest && user.user_metadata?.display_name) {
        displayName = user.user_metadata.display_name;
      } else if (!isGuest && user.email) {
        displayName = user.email;
      } else if (user.user_metadata?.display_name) {
        displayName = user.user_metadata.display_name;
      }
      
      console.log('Display name:', displayName);
      
      // Add player to room
      const addPlayer = async () => {
        try {
          console.log('Inserting player with data:', {
            room_id: roomId,
            user_id: user.id,
            name: displayName,
            lives: 3,
            is_alive: true
          });
          
          const { data, error } = await supabase
            .from('players')
            .insert({
              room_id: roomId,
              user_id: user.id,
              name: displayName,
              lives: 3,
              is_alive: true
            })
            .select();
            
          if (error) {
            console.error('Error adding player:', error);
          } else {
            console.log('Player added successfully:', data);
          }
        } catch (error) {
          console.error('Error adding player:', error);
        }
      };
      
      addPlayer();
    } else {
      console.log('User already exists as player:', currentUserPlayer);
    }
  }, [user, roomId, room, isGuest]);

  // Check word count and show import option if low
  const { data: wordCount = 0 } = useQuery({
    queryKey: ['word-count-check'],
    queryFn: async () => {
      const { count } = await supabase
        .from('danish_words')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const { submitWord, handleTimerExpired, isSubmitting } = useGameLogic(
    game,
    players,
    user?.id,
    room
  );

  const { handleTimerExpired: timerHandlerExpired } = useTimerHandler(game, players, room);
  const timeLeft = useGameTimer(game, timerHandlerExpired);

  // Show loading skeleton while data is loading
  if (roomLoading || gameLoading || playersLoading) {
    console.log('Loading states:', { roomLoading, gameLoading, playersLoading, room, game, players });
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 to-red-100 p-4">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className={`grid gap-8 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
            <div className={`space-y-6 ${isMobile ? '' : 'lg:col-span-2'}`}>
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle room query error
  if (roomError) {
    console.error('Room error:', roomError);
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="text-6xl animate-bounce">❌</div>
          <h2 className="text-2xl font-bold text-gray-800">Fejl ved indlæsning</h2>
          <p className="text-gray-600">Kunne ikke indlæse rummet. Prøv igen senere.</p>
        </div>
      </div>
    );
  }

  if (!room) {
    console.log('No room found for roomId:', roomId);
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="text-6xl animate-bounce">❌</div>
          <h2 className="text-2xl font-bold text-gray-800">Rum ikke fundet</h2>
          <p className="text-gray-600">Dette rum eksisterer ikke eller er blevet slettet.</p>
        </div>
      </div>
    );
  }

  // Only room creator can start the game
  const canStartGame = room.creator_id === user?.id && players.length >= 1;

  const renderGameContent = () => {
    if (!game || game.status === 'waiting') {
      return (
        <GameWaiting 
          isSinglePlayer={players.length === 1}
          players={players}
          currentUserId={user?.id}
          canStartGame={canStartGame}
          onStartGame={async () => {
            // Get a random syllable for the initial game state
            const initialSyllable = await selectRandomSyllable(room!.difficulty);
            
            if (!initialSyllable) {
              console.error('Failed to get initial syllable');
              return;
            }

            console.log('Starting game with syllable:', initialSyllable);
            
            // Calculate timer end time - exactly 15 seconds from now
            const timerDuration = 15; // Fixed 15 seconds for all players
            const timerEndTime = new Date(Date.now() + timerDuration * 1000);

            console.log(`Game starting with ${timerDuration} second timer, ending at:`, timerEndTime.toISOString());

            // Create a new game for this room
            const { error } = await supabase
              .from('games')
              .insert({
                room_id: roomId,
                status: 'playing',
                current_player_id: players[0]?.id,
                current_syllable: initialSyllable,
                timer_duration: timerDuration,
                timer_end_time: timerEndTime.toISOString(),
                round_number: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            
            if (error) {
              console.error('Error starting game:', error);
            }
          }}
          isLoading={playersLoading}
        />
      );
    }
    
    if (game.status === 'playing') {
      const currentPlayer = players.find(p => p.id === game.current_player_id);
      const isCurrentUser = currentPlayer?.user_id === user?.id;
      
      return (
        <GamePlaying 
          game={game}
          players={players}
          timeLeft={timeLeft}
          currentPlayer={currentPlayer}
          isCurrentUser={isCurrentUser}
          isSinglePlayer={players.length === 1}
          currentUserId={user?.id}
          onWordSubmit={submitWord}
          isSubmitting={isSubmitting}
        />
      );
    }
    
    if (game.status === 'finished') {
      return (
        <GameFinished 
          isSinglePlayer={players.length === 1}
          alivePlayers={players.filter(p => p.is_alive)}
          players={players}
          game={game}
          currentUserId={user?.id}
          onBackHome={() => window.location.href = '/'}
        />
      );
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-red-50 to-purple-100 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="animate-fade-in">
          <GameHeader 
            roomName={room.name}
            roomId={room.id}
            difficulty={room.difficulty}
            isSinglePlayer={players.length === 1}
          />
        </div>
        
        {/* Show word import option if word count is low */}
        {wordCount < 50000 && !isMobile && (
          <div className="animate-fade-in">
            <QuickWordImport />
          </div>
        )}
        
        <div className="animate-scale-in">
          {renderGameContent()}
        </div>
      </div>
    </div>
  );
};
