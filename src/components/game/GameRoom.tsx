import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GameHeader } from './GameHeader';
import { GameWaiting } from './GameWaiting';
import { GamePlaying } from './GamePlaying';
import { GameFinished } from './GameFinished';
import { QuickWordImport } from '../admin/QuickWordImport';
import { DebugPanel } from '../debug/DebugPanel';
import { useGameActions } from '@/hooks/useGameActions';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useTimerHandler } from '@/hooks/useTimerHandler';
import { useGameSubscriptions } from '@/hooks/useGameSubscriptions';
import { useGameInput } from '@/hooks/useGameInput';
import { useGameRealtime, useGameRealtimeFast } from '@/hooks/useGameRealtime';
import { useShadowGame } from '@/hooks/useShadowGame';
import { useEffectiveGame } from '@/hooks/useEffectiveGame';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRoomRealtime } from '@/hooks/useRoomRealtime';
import { useRoomChannel } from '@/hooks/useRoomChannel';
import { useFastGameSync } from '@/hooks/useFastGameSync';
import { Skeleton } from '@/components/ui/skeleton';
import { selectRandomSyllable } from '@/utils/syllableSelection';
import { getRandomDanishSyllable } from '@/utils/danishSyllables';
import { Tables } from '@/integrations/supabase/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRef } from 'react';

type Room = Tables<'rooms'>;
type Game = Tables<'games'>;
type Player = Tables<'players'>;

export const GameRoom = () => {
  const { roomId: roomLocator } = useParams<{ roomId: string }>();
  const { user, isGuest } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Shadow game state for instant turn updates
  const shadowGame = useShadowGame();

  // Fetch room details using locator (never put URL value into room.id)
  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ['room', roomLocator],
    queryFn: async () => {
      if (!roomLocator) return null;
      
      console.log('🔍 Fetching room with locator:', roomLocator);
      
      const { data, error } = await supabase.rpc('get_room_safe', { 
        p_room_locator: roomLocator 
      });
      
      if (error) {
        console.error('❌ Error fetching room:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error('Room not found');
      }
      
      console.log('✅ Room fetched:', data[0]);
      return data[0] as Room; // Contains real UUID in room.id
    },
    enabled: !!roomLocator,
  });

  const { data: game, isLoading: gameLoading } = useQuery({
    queryKey: ['game', room?.id],
    queryFn: async () => {
      if (!room?.id) return null;
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Game | null;
    },
    enabled: !!room?.id,
    // Remove aggressive polling - rely on real-time subscriptions instead
  });

  const { data: players = [], isLoading: playersLoading } = useQuery({
    queryKey: ['players', room?.id, isGuest, user?.id],
    queryFn: async () => {
      if (!room?.id) return [];
      const { data, error } = await supabase.rpc('get_players_public', {
        p_room_id: room.id,
        p_guest_id: isGuest ? (user?.id as string) : null,
      });
      if (error) throw error;
      // Ensure stable ordering by joined_at
      const sorted = (data || []).sort((a: any, b: any) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());
      return sorted as Player[];
    },
    enabled: !!room?.id,
    // Remove aggressive polling - rely on real-time subscriptions instead
  });

  // Ensure current user is added as a player when they enter the room
  useEffect(() => {
    if (!user || !room?.id || playersLoading) return;
    
    const currentUserPlayer = players.find(p => p.user_id === user.id);
    
    if (!currentUserPlayer) {
      console.log('Adding current user as player to room');
      
      // Get the proper display name for both authenticated and guest users
      const getDisplayName = async () => {
        let displayName = 'Anonymous';
        
        if ('isGuest' in user && user.isGuest) {
          // Guest user
          displayName = user.user_metadata?.display_name || 'Gæst';
        } else {
          // Authenticated user - try to get from profile first
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('user_id', user.id)
              .single();
            
            if (profile?.display_name) {
              displayName = profile.display_name;
            } else if (user.user_metadata?.display_name) {
              displayName = user.user_metadata.display_name;
            } else if (user.email) {
              displayName = user.email.split('@')[0]; // Use part before @ instead of full email
            }
          } catch (error) {
            // Fallback to metadata or email part
            if (user.user_metadata?.display_name) {
              displayName = user.user_metadata.display_name;
            } else if (user.email) {
              displayName = user.email.split('@')[0];
            }
          }
        }
        
        return displayName;
      };
      
      // Use the improved join function to ensure proper lives initialization
      const addPlayer = async () => {
        const displayName = await getDisplayName();
        
        const { data: playerId, error } = await supabase.rpc('join_room_with_lives', {
          p_room_id: room.id,
          p_user_id: user.id,
          p_name: displayName
        });
          
        if (error) {
          console.error('Error adding player:', error);
          toast({
            title: "Fejl",
            description: "Kunne ikke tilslutte til rummet",
            variant: "destructive",
          });
        } else {
          console.log('Player added/updated successfully with ID:', playerId);
          // Refresh player data
          queryClient.invalidateQueries({ queryKey: ['players', room.id, isGuest, user.id] });
        }
      };
      
      addPlayer();
    }
  }, [user, room?.id, room, players, playersLoading]);

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

  // Check if user is room creator using secure function
  const { data: isRoomCreator = false } = useQuery({
    queryKey: ['is-room-creator', room?.id, user?.id],
    queryFn: async () => {
      if (!user || isGuest || !room?.id) return false;
      const { data, error } = await supabase.rpc('is_room_creator', {
        p_room_id: room.id
      });
      if (error) return false;
      return data || false;
    },
    enabled: !!room?.id && !!user && !isGuest,
  });

  // Setup realtime listeners for instant updates
  useRoomRealtime(room?.id, () => {
    queryClient.invalidateQueries({ queryKey: ['game', room?.id] });
    queryClient.invalidateQueries({ queryKey: ['players', room?.id, isGuest, user?.id] });
  });

  // Setup room channel for broadcasts
  const channel = useRoomChannel(room?.id);

  // Subscribe to turn_advanced broadcasts
  useEffect(() => {
    if (!channel || !room?.id) return;
    const handler = () => queryClient.refetchQueries({ queryKey: ['game', room.id], type: 'active' });

    const subscription = channel.on('broadcast', { event: 'turn_advanced' }, handler);
    return () => { /* no-op: shared channel must stay alive */ };
  }, [channel, room?.id, queryClient]);

  // Fast sync for multiplayer games
  const isMultiplayer = (players?.length ?? 0) > 1;
  const playing = game?.status === 'playing';
  useFastGameSync(room?.id, isMultiplayer && playing, 150);

  // Setup game subscriptions
  const { cleanup: cleanupSubscriptions } = useGameSubscriptions({
    roomId: room?.id,
    gameId: game?.id,
    onGameUpdate: () => {
      console.log('🔄 Realtime: game update -> invalidate');
      queryClient.invalidateQueries({ queryKey: ['game', room?.id] });
    },
    onPlayersUpdate: () => {
      console.log('🔄 Realtime: players update -> invalidate');
      queryClient.invalidateQueries({ queryKey: ['players', room?.id] });
    },
  });

  // Zero-lag realtime for active game turns
  const turnAdvancedRef = useRef<number | null>(null);
  useGameRealtime({
    roomId: room?.id,
    gameId: game?.id,
    onTurnAdvance: (serverTurn) => {
      // whenever the server bumps the turn, clear any local submitting locks
      turnAdvancedRef.current = serverTurn;
      console.log('🚀 Turn advanced instantly via realtime:', serverTurn);
    },
  });

  // Use fast broadcast channel for instant multiplayer turn sync
  useGameRealtimeFast(room?.id);

  // Clear shadow state when server game updates  
  useEffect(() => shadowGame.clearIfNewer(game), [game?.id, (game as any)?.turn_seq]);

  // Build effective game that merges shadow + server state
  const snap = shadowGame.get();
  const eff = useEffectiveGame(game, snap);

  // Initialize game actions hook with roomLocator from URL
  const { submitWord, startNewGame, trackGameCompletion, isSubmitting } = useGameActions(room, roomLocator, players, eff, shadowGame);

  // Initialize timer handler with roomLocator and force refresh on timeout
  const { handleTimerExpired: timerHandlerExpired } = useTimerHandler(eff, players, room, roomLocator, undefined, user, shadowGame);
  
  // Wrap timer handler - no artificial delay, realtime + shadow will propagate instantly
  const handleTimerExpiredWithRefresh = async () => {
    await timerHandlerExpired();
    // No artificial delay – realtime + shadow will propagate instantly
  };
  
  const timeLeft = useGameTimer(eff, handleTimerExpiredWithRefresh);

  // Use the game input hook for proper input management
  const gameInput = useGameInput({
    game: eff,
    players,
    currentUserId: user?.id,
    onWordSubmit: submitWord,
    isSubmitting,
    shadowGame,
  });

  // Show loading skeleton while data is loading
  if (roomLoading || gameLoading || playersLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
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

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="text-6xl animate-bounce">❌</div>
          <h2 className="text-2xl font-bold text-foreground">Rum ikke fundet</h2>
          <p className="text-muted-foreground">Dette rum eksisterer ikke eller er blevet slettet.</p>
        </div>
      </div>
    );
  }

  const currentPlayer = players.find(p => p.id === eff?.current_player_id);
  const isCurrentUser = currentPlayer?.user_id === user?.id;

  const renderGameContent = () => {
    console.log('GameRoom renderGameContent - game:', game, 'players:', players);
    
    if (!eff || eff.status === 'waiting') {
      return (
        <GameWaiting 
          isSinglePlayer={players.length === 1}
          players={players}
          currentUserId={user?.id}
          room={room}
          onStartGame={startNewGame}
          isLoading={playersLoading}
        />
      );
    }
    
    if (eff.status === 'playing') {
      console.log('Rendering GamePlaying component');
      
      return (
        <GamePlaying 
          game={eff}
          players={players}
          timeLeft={timeLeft}
          currentPlayer={currentPlayer}
          isCurrentUser={gameInput.isCurrentUser}
          isSinglePlayer={players.length === 1}
          currentUserId={user?.id}
          gameInput={gameInput}
        />
      );
    }
    
    if (eff.status === 'finished') {
      return (
        <GameFinished 
          isSinglePlayer={players.length === 1}
          alivePlayers={players.filter(p => p.is_alive)}
          players={players}
          game={eff}
          currentUserId={user?.id}
          onBackHome={() => window.location.href = '/'}
          room={room}
          roomLocator={roomLocator}
        />
      );
    }
    
    return null;
  };

  return (
    <div className={cn(
      "bg-background p-4",
      isMobile ? "mobile-safe-area" : "min-h-screen"
    )}>
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

        {/* Debug panel for admins */}
        <DebugPanel roomId={room.id} />
        
        <div className="animate-scale-in">
          {renderGameContent()}
        </div>
      </div>
    </div>
  );
};