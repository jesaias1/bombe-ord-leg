
import { useCallback, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useRoomChannel } from '@/hooks/useRoomChannel';
import { useUserStats } from '@/hooks/useUserStats';
import { Tables } from '@/integrations/supabase/types';
import { useServerClock } from './useServerClock';

type Room = Tables<'rooms'>;
type Game = Tables<'games'>;

export const useGameActions = (
  room: Room | null,
  roomLocator?: string,
  players: any[] = [],
  game?: Tables<'games'>,
  shadowGame?: { apply: (snapshot: any) => void }
) => {
  const queryClient = useQueryClient();
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const isSubmittingRef = useRef(false);
  const { offsetMs } = useServerClock();
  const { 
    incrementWordsGuessed, 
    updateStreak, 
    incrementGamesPlayed, 
    incrementGamesWon,
    updateFastestWordTime,
    addPlaytime 
  } = useUserStats();
  const channel = useRoomChannel(room?.id || roomLocator);

  const submitWord = useCallback(async (word: string): Promise<boolean> => {
    console.log('useGameActions: submitWord called with word:', word);
    if (!user) {
      console.log('useGameActions: No user found, submission blocked');
      return false;
    }

    // only my turn
    const me = players.find(p => p.user_id === user.id) ?? players.find(p => p.is_me);
    if (!me?.id || game?.current_player_id !== me.id) {
      console.log('useGameActions: Not my turn, submission blocked. Current player:', game?.current_player_id, 'My player ID:', me?.id);
      return false;
    }

    // Submission guard uses server time + grace
    const GRACE_MS = 200;
    const end = game?.timer_end_time ? new Date(game.timer_end_time).getTime() : 0;
    const serverNow = Date.now() + offsetMs;

    if (end && serverNow > end + GRACE_MS) {
      console.log('Timer expired on client - skipping submit');
      return false;
    }

    // prevent double-submit
    if (isSubmittingRef.current) {
      console.log('useGameActions: Already submitting, blocked');
      return false;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    console.log('useGameActions: Proceeding with word submission to backend');

    try {
      const payload = {
        p_room_id: room?.id || roomLocator,   // TEXT room code or UUID string
        p_player_id: me.id,                   // Player UUID
        p_word: word.trim().toLowerCase(),
        p_turn_seq: (game as any)?.turn_seq ?? 0       // atomic per-turn submit
      };

      console.log('useGameActions: Submitting to backend with payload:', payload);
      const { data, error } = await supabase.rpc('submit_word', payload);

      if (error) {
        toast({
          title: "Ugyldigt ord",
          description: error.message || "Kunne ikke indsende ordet",
          variant: "destructive",
        });
        return false; // stays same turn; NO HP change
      }

      if (data) {
        // Type assertion for the data response
        const responseData = data as {
          success: boolean;
          ignored?: boolean;
          error?: string;
          word_accepted?: string;
          next_player?: string;
          next_syllable?: string;
          current_player_id?: string;
          current_player_name?: string;
          current_syllable?: string;
          timer_end_time?: string;
          timer_duration?: number;
          turn_seq?: number;
        };
        
        // Handle ignored/stale submissions
        if (responseData.ignored) {
          return false;
        }
        
        if (responseData.success) {
          // Track stats for registered users only
          if (!isGuest) {
            incrementWordsGuessed();
            updateStreak(true);
          }

          // Immediately update React Query cache for optimistic turn advance
          if (responseData.timer_end_time) {
            queryClient.setQueryData(['game', room?.id], (prev: any) => {
              if (!prev) return prev;
              return {
                ...prev,
                current_player_id: responseData.current_player_id ?? prev.current_player_id,
                current_syllable: responseData.current_syllable ?? prev.current_syllable,
                timer_end_time: responseData.timer_end_time ?? prev.timer_end_time,
                timer_duration: responseData.timer_duration ?? prev.timer_duration,
                turn_seq: responseData.turn_seq ?? (prev.turn_seq ?? 0) + 1,
                status: 'playing',
                updated_at: new Date().toISOString(),
              };
            });
            // Fire a tiny safety invalidate shortly after
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['game', room?.id] });
            }, 300);
          }

          // Apply shadow state immediately for instant UI update
          if (shadowGame && responseData.turn_seq && responseData.current_player_id && 
              responseData.current_syllable && responseData.timer_end_time && 
              responseData.timer_duration) {
            shadowGame.apply({
              turn_seq: responseData.turn_seq,
              current_player_id: responseData.current_player_id,
              current_syllable: responseData.current_syllable,
              timer_duration: responseData.timer_duration,
              timer_end_time: responseData.timer_end_time,
            });
          }

          // Solo fallback: if there's only me in the room, force a quick refresh
          const isSolo = Array.isArray(players) && players.filter(p => p.is_alive !== false).length <= 1;
          if (isSolo && room?.id) {
            // small microtask/timeout so UI can apply shadow first
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['game', room.id] });
            }, 0);
          }

          // Broadcast turn advance to other clients
          try {
            console.debug('[broadcast] sending turn_advanced from submitWord');
            const res = await channel?.send({
              type: 'broadcast',
              event: 'turn_advanced',
              payload: {
                roomId: room?.id || roomLocator,
                at: Date.now(),
              },
            });
            if (res?.error) console.warn('[broadcast] send error', res.error);
          } catch (e) {
            console.warn('[broadcast] send failed', e);
          }

          // tiny safety net in case packet is dropped
          setTimeout(() => {
            queryClient.refetchQueries({ queryKey: ['game', room?.id], type: 'active' });
          }, 180);

          toast({
            title: "Godt ord! 🎉",
            description: `"${responseData.word_accepted}" blev accepteret. Næste spiller: ${responseData.next_player}`,
          });

          setCurrentWord('');
          
          return true;
        } else {
          toast({
            title: "Ugyldigt ord",
            description: responseData.error || 'Ordet blev ikke accepteret - prøv igen!',
            variant: "destructive",
          });
          
          // Update streak for wrong answer (only for registered users)
          if (!isGuest) {
            updateStreak(false);
          }
          
          return false;
        }
      }

      return false;
    } catch {
      toast({
        title: "Fejl",
        description: "Uventet fejl – prøv igen",
        variant: "destructive",
      });
      return false;
    } finally {
      isSubmittingRef.current = false; // ALWAYS unlock
      setIsSubmitting(false);
    }
  }, [user, players, game?.current_player_id, game?.turn_seq, room?.id, roomLocator, setCurrentWord, toast, isGuest, incrementWordsGuessed, updateStreak, queryClient, offsetMs, shadowGame]);

  const startGame = useCallback(async () => {
    if (!user) {
      console.error('No user logged in');
      return false;
    }

    try {
      // Reset all players to 3 lives when starting a new game
      const { error: resetError } = await supabase.rpc('start_game_reset_lives', {
        p_room_id: room?.id || roomLocator
      });
      
      if (resetError) {
        console.error('Error resetting player lives:', resetError);
        toast({
          title: "Fejl",
          description: "Kunne ikke starte spillet - prøv igen",
          variant: "destructive",
        });
        return false;
      }
      
      console.log('Starting game for room:', room?.id || roomLocator);
      
      // Track game started for registered users
      if (!isGuest) {
        incrementGamesPlayed();
      }

      toast({
        title: "Spil startet! 🚀",
        description: "Alle spillere har nu 3 liv",
      });

      return true;
    } catch (err) {
      console.error('Unexpected error starting game:', err);
      toast({
        title: "Fejl",
        description: "Uventet fejl ved start af spil",
        variant: "destructive",
      });
      return false;
    }
  }, [user, room, roomLocator, toast, isGuest, incrementGamesPlayed]);

  const leaveRoom = useCallback(async () => {
    if (!user) {
      console.error('No user logged in');
      return false;
    }

    try {
      // For now, we'll handle room leaving in the frontend until we create the leave_room function
      console.log('Leaving room:', room?.id || roomLocator);
      return true;
    } catch (err) {
      console.error('Unexpected error leaving room:', err);
      return false;
    }
  }, [user, room, roomLocator]);

  // Helper function to track game completion
  const trackGameCompletion = useCallback((won: boolean, playtimeSeconds: number) => {
    if (!isGuest) {
      if (won) {
        incrementGamesWon();
      }
      addPlaytime(playtimeSeconds);
    }
  }, [isGuest, incrementGamesWon, addPlaytime]);

  // startNewGame: works for both solo and multiplayer
  const startNewGame = useCallback(async (): Promise<boolean> => {
    if (!room?.id) return false;

    try {
      const { data, error } = await supabase.rpc('start_new_game', {
        p_room_id: room.id,
        p_user_id: user?.id ?? 'guest'
      });

      if (error || !(data as any)?.success) {
        console.error('start_new_game error:', error || data);
        toast({
          title: 'Fejl',
          description: (data as any)?.error ?? 'Kunne ikke starte spillet',
          variant: 'destructive',
        });
        return false;
      }

      // Don't wait for refetch - realtime updates will handle this instantly
      return true;
    } catch (e) {
      console.error(e);
      toast({ title: 'Fejl', description: 'Uventet fejl ved start', variant: 'destructive' });
      return false;
    }
  }, [room?.id, user?.id, queryClient, toast]);

  return {
    submitWord,
    startGame,
    startNewGame,
    leaveRoom,
    trackGameCompletion,
    isSubmitting,
    currentWord,
    setCurrentWord,
  };
};
