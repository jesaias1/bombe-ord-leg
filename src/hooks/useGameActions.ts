
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

          toast({
            title: "Godt ord! 🎉",
            description: `"${responseData.word_accepted}" blev accepteret. Næste spiller: ${responseData.next_player}`,
          });

          setCurrentWord('');
          
          // Force refresh after successful word to ensure game state syncs
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          
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
  }, [user, players, game?.current_player_id, game?.turn_seq, room?.id, roomLocator, setCurrentWord, toast, isGuest, incrementWordsGuessed, updateStreak]);

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
