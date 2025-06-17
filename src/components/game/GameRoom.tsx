
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
import { Tables } from '@/integrations/supabase/types';

type Room = Tables<'rooms'>;
type Game = Tables<'games'>;
type Player = Tables<'players'>;

export const GameRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();

  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ['room', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      if (error) throw error;
      return data as Room;
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
    refetchInterval: 1000,
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
    refetchInterval: 1000,
  });

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 to-red-100 p-4">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
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

  if (!room) {
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

  // Check if user is room creator to enable start game
  const isRoomCreator = room.creator_id === user?.id;
  const canStartGame = isRoomCreator || players.length >= 1; // Allow solo practice

  const renderGameContent = () => {
    if (!game || game.status === 'waiting') {
      return (
        <GameWaiting 
          isSinglePlayer={players.length === 1}
          players={players}
          currentUserId={user?.id}
          canStartGame={canStartGame}
          onStartGame={async () => {
            // Create a new game for this room
            const { error } = await supabase
              .from('games')
              .insert({
                room_id: roomId,
                status: 'playing',
                current_player_id: players[0]?.id,
                current_syllable: 'ka', // Will be overridden by first syllable selection
                timer_duration: 15,
                timer_end_time: new Date(Date.now() + 15000).toISOString()
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
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-red-50 to-purple-100 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/3 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        <div className="animate-fade-in">
          <GameHeader 
            roomName={room.name}
            roomId={room.id}
            difficulty={room.difficulty}
            isSinglePlayer={players.length === 1}
          />
        </div>
        
        {/* Show word import option if word count is low */}
        {wordCount < 50000 && (
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
