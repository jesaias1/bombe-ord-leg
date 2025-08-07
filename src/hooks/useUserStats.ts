
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Tables } from '@/integrations/supabase/types';

type UserStats = Tables<'user_stats'>;

export const useUserStats = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user stats:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user,
  });

  // Create stats if they don't exist
  const createStatsMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('user_stats')
        .insert({
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-stats', user?.id] });
    },
  });

  // Update stats mutation
  const updateStatsMutation = useMutation({
    mutationFn: async (updates: Partial<UserStats>) => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('user_stats')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error updating user stats:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-stats', user?.id] });
    },
    onError: (error) => {
      console.error('Failed to update user stats:', error);
    }
  });

  // Create stats if user exists but no stats found
  useEffect(() => {
    if (user && !isLoading && !stats) {
      createStatsMutation.mutate();
    }
  }, [user, stats, isLoading]);

  const updateStats = (updates: Partial<UserStats>) => {
    // Only update if stats exist and user is not a guest
    if (stats && user && !('isGuest' in user && user.isGuest)) {
      updateStatsMutation.mutate(updates);
    }
  };

  // Helper functions for common stat updates
  const incrementWordsGuessed = () => {
    if (stats && user && !('isGuest' in user && user.isGuest)) {
      updateStats({
        total_words_guessed: stats.total_words_guessed + 1,
      });
    }
  };

  const updateStreak = (isCorrect: boolean) => {
    if (stats && user && !('isGuest' in user && user.isGuest)) {
      const newCurrentStreak = isCorrect ? stats.current_streak + 1 : 0;
      const newLongestStreak = Math.max(stats.longest_streak, newCurrentStreak);
      
      updateStats({
        current_streak: newCurrentStreak,
        longest_streak: newLongestStreak,
      });
    }
  };

  const incrementGamesPlayed = () => {
    if (stats && user && !('isGuest' in user && user.isGuest)) {
      updateStats({
        total_games_played: stats.total_games_played + 1,
      });
    }
  };

  const incrementGamesWon = () => {
    if (stats && user && !('isGuest' in user && user.isGuest)) {
      updateStats({
        total_games_won: stats.total_games_won + 1,
      });
    }
  };

  const updateFastestWordTime = (timeMs: number) => {
    if (stats && user && !('isGuest' in user && user.isGuest) && (!stats.fastest_word_time || timeMs < stats.fastest_word_time)) {
      updateStats({
        fastest_word_time: timeMs,
      });
    }
  };

  const addPlaytime = (seconds: number) => {
    if (stats && user && !('isGuest' in user && user.isGuest)) {
      updateStats({
        total_playtime_seconds: stats.total_playtime_seconds + seconds,
      });
    }
  };

  return {
    stats,
    isLoading,
    updateStats,
    incrementWordsGuessed,
    updateStreak: updateStreak as (isCorrect: boolean) => void,
    incrementGamesPlayed,
    incrementGamesWon,
    updateFastestWordTime,
    addPlaytime,
  };
};
