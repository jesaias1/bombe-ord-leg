
import { useCallback, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useUserStats } from '@/hooks/useUserStats';
import { Tables } from '@/integrations/supabase/types';

type Room = Tables<'rooms'>;
type Game = Tables<'games'>;

export const useGameActions = (room: Room | null, roomLocator?: string, players: any[] = [], game: Game | null = null) => {
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const isSubmittingRef = useRef(false);
  const { 
    incrementWordsGuessed, 
    updateStreak, 
    incrementGamesPlayed, 
    incrementGamesWon,
    updateFastestWordTime,
    addPlaytime 
  } = useUserStats();

  const submitWord = useCallback(async (word: string): Promise<boolean> => {
    if (!user) {
      console.error('No user logged in');
      return false;
    }

    // Guard: only my turn
    const me = players.find(p => p.user_id === user.id) ?? players.find(p => p.is_me);
    if (!me?.id || game?.current_player_id !== me.id) {
      return false;
    }

    // Guard: no double submit in the same render-frame
    if (isSubmittingRef.current) {
      return false;
    }
    
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const wordStartTime = Date.now();

    try {
      const payload = {
        p_room_id: room?.id || roomLocator,       // TEXT room code
        p_player_id: me.id,                        // Player UUID
        p_word: word.trim().toLowerCase(),
        p_turn_seq: game?.turn_seq ?? 0           // Send current turn
      };
      
      console.log('🚀 RPC submit_word payload:', payload);

      const { data, error } = await supabase.rpc('submit_word', payload);

      if (error) {
        console.error('RPC Error:', error);
        
        // Ignore expected idempotency/stale cases (no scary toast)
        if (error.message?.toLowerCase().includes('stale') ||
            error.message?.toLowerCase().includes('turn already advanced')) {
          return false;
        }
        
        toast({
          title: "Ugyldigt ord",
          description: error.message || "Kunne ikke indsende ordet",
          variant: "destructive",
        });
        
        // Update streak for wrong answer (only for registered users)
        if (!isGuest) {
          updateStreak(false);
        }
        
        return false;
      }

      if (data) {
        console.log('Word submission response:', data);
        
        // Type assertion for the data response
        const responseData = data as {
          success: boolean;
          ignored?: boolean;
          error?: string;
          word_accepted?: string;
          next_player?: string;
          next_syllable?: string;
        };
        
        // Handle ignored/stale submissions
        if (responseData.ignored) {
          return false;
        }
        
        if (responseData.success) {
          // Valid word - clear input, advance turn, show success
          const wordTime = Date.now() - wordStartTime;
          
          // Track stats for registered users only
          if (!isGuest) {
            incrementWordsGuessed();
            updateStreak(true);
            updateFastestWordTime(wordTime);
          }

          toast({
            title: "Godt ord! 🎉",
            description: `"${responseData.word_accepted}" blev accepteret. Næste spiller: ${responseData.next_player}`,
          });

          // Clear the current word after successful submission
          setCurrentWord('');
          return true;
        } else {
          // Invalid word - show error but don't clear input
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
    } catch (err) {
      console.error('Unexpected error submitting word:', err);
      
      toast({
        title: "Fejl",
        description: "Uventet fejl – prøv igen",
        variant: "destructive",
      });
      
      // Update streak for wrong answer (only for registered users)
      if (!isGuest) {
        updateStreak(false);
      }
      
      return false;
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);          // Always unlocks input
    }
  }, [user, room, roomLocator, players, game, toast, isGuest, incrementWordsGuessed, updateStreak, updateFastestWordTime]);

  const startGame = useCallback(async () => {
    if (!user) {
      console.error('No user logged in');
      return false;
    }

    try {
      // For now, we'll handle game starting in the frontend until we create the start_game function
      console.log('Starting game for room:', room?.id || roomLocator);
      
      // Track game started for registered users
      if (!isGuest) {
        incrementGamesPlayed();
      }

      toast({
        title: "Spil startet! 🚀",
        description: "Spillet er nu i gang",
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

  return {
    submitWord,
    startGame,
    leaveRoom,
    trackGameCompletion,
    isSubmitting,
    currentWord,
    setCurrentWord,
  };
};
