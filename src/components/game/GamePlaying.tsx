
import { BombTimer } from './BombTimer';
import { PlayerList } from './PlayerList';
import { WordInput } from './WordInput';
import { Tables } from '@/integrations/supabase/types';

type Player = Tables<'players'>;
type Game = Tables<'games'>;

interface GamePlayingProps {
  game: Game;
  players: Player[];
  timeLeft: number;
  currentPlayer?: Player;
  isCurrentUser: boolean;
  isSinglePlayer: boolean;
  currentUserId?: string;
  onWordSubmit: (word: string) => Promise<boolean>;
  isSubmitting?: boolean;
}

export const GamePlaying = ({
  game,
  players,
  timeLeft,
  currentPlayer,
  isCurrentUser,
  isSinglePlayer,
  currentUserId,
  onWordSubmit,
  isSubmitting = false
}: GamePlayingProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="text-center">
          <BombTimer
            timeLeft={timeLeft}
            totalTime={game.timer_duration || 15}
            isActive={game.status === 'playing'}
            syllable={game.current_syllable || ''}
          />
        </div>

        <div className="text-center space-y-4">
          {currentPlayer && (
            <p className="text-xl font-semibold">
              {isCurrentUser ? 
                (isSinglePlayer ? "Find et ord!" : "Din tur!") : 
                `${currentPlayer.name}s tur`
              }
            </p>
          )}
          
          <WordInput
            onSubmit={onWordSubmit}
            disabled={!isCurrentUser || timeLeft <= 0}
            currentSyllable={game.current_syllable || ''}
            isSubmitting={isSubmitting}
          />

          {game.used_words && game.used_words.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Brugte ord:</h3>
              <div className="flex flex-wrap gap-2">
                {game.used_words.map((word, index) => (
                  <span key={index} className="bg-gray-200 px-2 py-1 rounded text-sm">
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <PlayerList 
          players={players} 
          currentPlayerId={game.current_player_id || undefined}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
};
