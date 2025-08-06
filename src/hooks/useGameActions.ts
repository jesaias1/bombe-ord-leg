
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
      console.log('🎯 Calling submit_word RPC with:', {
        p_room_id: roomId,
        p_user_id: user.id,
        p_word: word.toLowerCase().trim()
      });
      
      const { data, error } = await supabase.rpc('submit_word', {
        p_room_id: roomId,
        p_user_id: user.id,
        p_word: word.toLowerCase().trim()
      });
      
      console.log('🎯 RPC Response - data:', data, 'error:', error);

      if (error) {
        console.error('RPC Error:', error);
        
        // Show user-friendly error messages
        if (error.message.includes('already used')) {
          toast({
            title: "Ord allerede brugt",
            description: "Dette ord er allerede blevet brugt i spillet",
            variant: "destructive",
          });
        } else if (error.message.includes('not contain')) {
          toast({
            title: "Ord indeholder ikke stavelsen",
            description: "Dit ord skal indeholde den viste stavelse",
            variant: "destructive",
          });
        } else if (error.message.includes('not valid')) {
          toast({
            title: "Ugyldigt ord",
            description: "Ordet blev ikke fundet i ordbogen",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Fejl",
            description: error.message || "Kunne ikke indsende ordet",
            variant: "destructive",
          });
        }
        
        // Update streak for wrong answer (only for registered users)
        if (!isGuest) {
          updateStreak(false);
        }
        
        return false;
      }

      console.log('Word submitted successfully:', data);
      
      // Track stats for registered users only
      if (!isGuest) {
        const wordTime = Date.now() - wordStartTime;
        incrementWordsGuessed();
        updateStreak(true);
        updateFastestWordTime(wordTime);
      }

      toast({
        title: "Godt ord! 🎉",
        description: `"${word}" blev accepteret`,
      });

      // Clear the current word after successful submission
      setCurrentWord('');

      return true;
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
