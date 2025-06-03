
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

type Room = Tables<'rooms'>;
type Game = Tables<'games'>;
type Player = Tables<'players'>;

export const useGameLogic = () => {
  const { toast } = useToast();

  const getDifficultyThreshold = (difficulty: string) => {
    switch (difficulty) {
      case 'let': return 500;
      case 'mellem': return 300;
      case 'svaer': return 100;
      default: return 300;
    }
  };

  const handleTimerExpired = async (game: Game, players: Player[]) => {
    if (!game?.current_player_id) return;

    const currentPlayer = players.find(p => p.id === game.current_player_id);
    if (currentPlayer) {
      const newLives = currentPlayer.lives - 1;
      const isStillAlive = newLives > 0;

      await supabase
        .from('players')
        .update({ 
          lives: newLives,
          is_alive: isStillAlive
        })
        .eq('id', currentPlayer.id);

      toast({
        title: "💥 Bomben eksploderede!",
        description: `${currentPlayer.name} mistede et liv`,
        variant: "destructive",
      });
    }
  };

  const startNewRound = async (game: Game, room: Room, playerId: string) => {
    if (!game || !room) return;

    const { data: syllables } = await supabase
      .from('syllables')
      .select('syllable')
      .eq('difficulty', room.difficulty)
      .gte('word_count', getDifficultyThreshold(room.difficulty));

    const randomSyllable = syllables?.[Math.floor(Math.random() * syllables.length)]?.syllable || 'ing';

    const timerDuration = Math.floor(Math.random() * 16) + 10;
    const timerEndTime = new Date(Date.now() + timerDuration * 1000);

    await supabase
      .from('games')
      .update({
        current_player_id: playerId,
        current_syllable: randomSyllable,
        timer_end_time: timerEndTime.toISOString(),
        timer_duration: timerDuration
      })
      .eq('id', game.id);
  };

  const nextTurn = async (game: Game, players: Player[]) => {
    if (!game) return;

    const alivePlayers = players.filter(p => p.is_alive);
    
    if (alivePlayers.length === 1) {
      const player = alivePlayers[0];
      
      if (player.lives <= 0) {
        await supabase
          .from('games')
          .update({ status: 'finished' })
          .eq('id', game.id);
        return;
      }
      
      // Continue with same player for solo play - don't call startNewRound here
      return;
    }

    if (alivePlayers.length <= 1) {
      await supabase
        .from('games')
        .update({ status: 'finished' })
        .eq('id', game.id);
      return;
    }

    const currentIndex = alivePlayers.findIndex(p => p.id === game.current_player_id);
    const nextIndex = (currentIndex + 1) % alivePlayers.length;
    const nextPlayer = alivePlayers[nextIndex];

    // Don't call startNewRound here either - let the main component handle it
    return nextPlayer.id;
  };

  const validateAndSubmitWord = async (word: string, game: Game, userId: string) => {
    console.log('Submitting word:', word);
    console.log('Current syllable:', game.current_syllable);
    console.log('Used words:', game.used_words);

    const normalizedWord = word.toLowerCase().trim();

    if (!normalizedWord.includes(game.current_syllable?.toLowerCase() || '')) {
      toast({
        title: "Forkert stavelse",
        description: `Ordet skal indeholde "${game.current_syllable}"`,
        variant: "destructive",
      });
      return false;
    }

    if (game.used_words?.includes(normalizedWord)) {
      toast({
        title: "Allerede brugt",
        description: "Dette ord er allerede blevet brugt",
        variant: "destructive",
      });
      return false;
    }

    const { data: validWord, error: wordError } = await supabase
      .from('danish_words')
      .select('word')
      .eq('word', normalizedWord)
      .maybeSingle();

    console.log('Word validation result:', validWord, wordError);

    if (!validWord) {
      toast({
        title: "Ikke fundet i ordbogen",
        description: "Dette ord findes ikke i ordbogen",
        variant: "destructive",
      });
      return false;
    }

    const updatedUsedWords = [...(game.used_words || []), normalizedWord];
    
    await supabase
      .from('games')
      .update({ used_words: updatedUsedWords })
      .eq('id', game.id);

    toast({
      title: "Godt ord! 🎉",
      description: `"${normalizedWord}" blev accepteret`,
    });

    return true;
  };

  return {
    handleTimerExpired,
    startNewRound,
    nextTurn,
    validateAndSubmitWord,
    getDifficultyThreshold
  };
};
