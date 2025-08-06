
import { BombTimer } from './BombTimer';
import { PlayerList } from './PlayerList';
import { WordInput } from './WordInput';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

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
  onWordChange?: (word: string) => void;
  isSubmitting?: boolean;
  currentWord?: string;
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
  isSubmitting = false,
  currentWord,
  onWordChange
}: GamePlayingProps) => {
  const isMobile = useIsMobile();

  return (
    <div className={cn(
      "gap-8 animate-fade-in",
      isMobile ? "flex flex-col space-y-4" : "grid grid-cols-1 lg:grid-cols-3"
    )}>
      {/* Mobile keyboard-friendly layout */}
      {isMobile ? (
        <div className="fixed inset-0 flex flex-col">
          {/* Top section - always visible above keyboard */}
          <div className="flex-none bg-background border-b border-border p-4 space-y-3">
            {/* Timer and syllable in one line */}
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">
                {timeLeft}s
              </div>
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg px-4 py-2 border border-yellow-300 dark:border-yellow-700">
                <span className="text-lg font-black text-orange-900 dark:text-orange-100">{game.current_syllable}</span>
              </div>
            </div>

            {/* Current player indicator - compact */}
            {currentPlayer && (
              <div className={cn(
                "rounded-lg p-2 text-center text-sm font-bold border",
                isCurrentUser 
                  ? "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700" 
                  : "bg-muted text-muted-foreground border-border"
              )}>
                {isCurrentUser ? "Din tur!" : `${currentPlayer.name}s tur`}
              </div>
            )}
          </div>
          
          {/* Bottom section - input field positioned above keyboard */}
          <div className="flex-none p-4 bg-background border-t border-border">
            <WordInput
              onSubmit={onWordSubmit}
              disabled={!isCurrentUser || timeLeft <= 0}
              currentSyllable={game.current_syllable || ''}
              isSubmitting={isSubmitting}
              onWordChange={onWordChange}
            />
          </div>
        </div>
      ) : (
        /* Desktop layout */
        <>
          <div className="lg:col-span-2 space-y-24">
            <div className="text-center relative mt-12">
              {/* Glowing ring around timer */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={cn(
                  "rounded-full border-4 w-72 h-72",
                  timeLeft <= 5 
                    ? "border-red-400 shadow-lg shadow-red-400/50 animate-[pulse_4s_ease-in-out_infinite]" 
                    : "border-orange-400 shadow-lg shadow-orange-400/30"
                )}></div>
              </div>
              
              <div className="relative z-20">
                <BombTimer
                  timeLeft={timeLeft}
                  totalTime={game.timer_duration || 15}
                  isActive={game.status === 'playing'}
                  syllable={game.current_syllable || ''}
                />
              </div>
            </div>

            <div className="text-center space-y-12">
              {currentPlayer && (
                <div className={cn(
                  "rounded-xl p-4 shadow-xl border-2 transition-all duration-500 transform hover:scale-[1.02]",
                  isCurrentUser 
                    ? "bg-gradient-to-r from-purple-100 via-pink-50 to-purple-100 dark:from-purple-900/20 dark:via-pink-900/10 dark:to-purple-900/20 border-purple-300 dark:border-purple-700" 
                    : "bg-gradient-to-r from-muted/50 to-muted border-border"
                )}>
                  <p className={cn(
                    "text-xl font-bold transition-all duration-300",
                    isCurrentUser ? "text-purple-700 dark:text-purple-300" : "text-muted-foreground"
                  )}>
                    {isCurrentUser ? 
                      (isSinglePlayer ? "🎯 Din tur!" : "🎉 Din tur!") : 
                      `🎮 ${currentPlayer.name}s tur`
                    }
                  </p>
                </div>
              )}
              
              <div className="bg-card/90 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-border transform hover:shadow-2xl transition-all duration-300">
                <WordInput
                  onSubmit={onWordSubmit}
                  disabled={!isCurrentUser || timeLeft <= 0}
                  currentSyllable={game.current_syllable || ''}
                  isSubmitting={isSubmitting}
                  onWordChange={onWordChange}
                />
              </div>

              {game.used_words && game.used_words.length > 0 && (
                <div className="bg-gradient-to-r from-muted/30 to-blue-50 dark:from-muted/10 dark:to-blue-900/10 rounded-xl p-6 shadow-lg border border-border animate-fade-in">
                  <h3 className="font-bold text-lg mb-4 text-foreground flex items-center justify-center">
                    📝 Brugte ord ({game.used_words.length})
                  </h3>
                  <div className="flex flex-wrap gap-3 justify-center max-h-32 overflow-y-auto">
                    {game.used_words.map((word, index) => (
                      <span 
                        key={index} 
                        className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-lg text-sm font-medium shadow-md border border-blue-200 dark:border-blue-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 animate-scale-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="transform hover:scale-[1.02] transition-all duration-300">
              <PlayerList 
                players={players} 
                currentPlayerId={game.current_player_id || undefined}
                currentUserId={currentUserId}
              />
            </div>
            
            {/* Enhanced game stats card */}
            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 shadow-xl border border-indigo-200 dark:border-indigo-700 transform hover:scale-[1.02] transition-all duration-300">
              <h4 className="font-bold text-indigo-800 dark:text-indigo-200 mb-4 flex items-center">
                <span className="text-2xl mr-2">📊</span>
                Spil statistik
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-card/50 rounded-lg">
                  <span className="text-muted-foreground">Runde:</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-300 text-lg">{game.round_number || 1}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-card/50 rounded-lg">
                  <span className="text-muted-foreground">Ord brugt:</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-300 text-lg">{game.used_words?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-card/50 rounded-lg">
                  <span className="text-muted-foreground">Aktive spillere:</span>
                  <span className="font-bold text-green-600 dark:text-green-400 text-lg">{players.filter(p => p.is_alive).length}</span>
                </div>
                {isSinglePlayer && (
                  <div className="flex justify-between items-center p-2 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <span className="text-muted-foreground">Træning mode:</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">🎯 Aktiv</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
