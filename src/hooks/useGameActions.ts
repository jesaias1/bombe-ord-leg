
import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useUserStats } from '@/hooks/useUserStats';

export const useGameActions = (roomId: string) => {
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const { 
    incrementWordsGuessed, 
    updateStreak, 
    incrementGamesPlayed, 
    incrementGamesWon,
    updateFastestWordTime,
    addPlaytime 
  } = useUserStats();

  const submitWord = useCallback(async (word: string): Promise<boolean> => {
    if (!user || isSubmitting) {
      console.error('No user logged in or already submitting');
      return false;
    }

    console.log('Submitting word:', word, 'for user:', user.id);
    setIsSubmitting(true);

    const wordStartTime = Date.now();

    try {
      const { data, error } = await supabase.rpc('submit_word', {
        p_room_id: roomId,
        p_user_id: user.id,
        p_word: word.toLowerCase().trim()
      });

      if (error) {
        console.error('RPC Error:', error);
        toast({
          title: "Fejl",
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
          error?: string;
          lives_remaining?: number;
          player_eliminated?: boolean;
          game_ended?: boolean;
          next_player?: string;
          next_syllable?: string;
          word_accepted?: string;
        };
        
        if (responseData.success) {
          // Valid word - show success message
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
          // Invalid word - server handled HP decrement
          const livesMsg = responseData.lives_remaining ? 
            (responseData.lives_remaining > 0 ? `${responseData.lives_remaining} liv tilbage` : 'Elimineret!') 
            : '';
          
          let description = responseData.error || 'Ukendt fejl';
          if (livesMsg) {
            description += ` - ${livesMsg}`;
          }
          
          if (responseData.game_ended) {
            description += ' - Spillet er slut!';
          } else if (responseData.player_eliminated) {
            description += ' - Du er elimineret!';
          }

          toast({
            title: "Ugyldigt ord",
            description: description,
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
        description: "Uventet fejl - prøv igen",
        variant: "destructive",
      });
      
      // Update streak for wrong answer (only for registered users)
      if (!isGuest) {
        updateStreak(false);
      }
      
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [user, roomId, toast, isGuest, incrementWordsGuessed, updateStreak, updateFastestWordTime, isSubmitting]);

  const startGame = useCallback(async () => {
    if (!user) {
      console.error('No user logged in');
      return false;
    }

    try {
      // For now, we'll handle game starting in the frontend until we create the start_game function
      console.log('Starting game for room:', roomId);
      
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
  }, [user, roomId, toast, isGuest, incrementGamesPlayed]);

  const leaveRoom = useCallback(async () => {
    if (!user) {
      console.error('No user logged in');
      return false;
    }

    try {
      // For now, we'll handle room leaving in the frontend until we create the leave_room function
      console.log('Leaving room:', roomId);
      return true;
    } catch (err) {
      console.error('Unexpected error leaving room:', err);
      return false;
    }
  }, [user, roomId]);

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
