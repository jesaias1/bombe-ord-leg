
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
  const isMobile = useIsMobile();

  return (
    <div className={cn(
      "gap-8 animate-fade-in",
      isMobile ? "flex flex-col space-y-4" : "grid grid-cols-1 lg:grid-cols-3"
    )}>
      {/* Mobile compact layout */}
      {isMobile ? (
        <div className="space-y-4">
          {/* Compact timer and syllable display */}
          <div className="text-center relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={cn(
                "rounded-full border-4 w-48 h-48",
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

          {/* Current player indicator */}
          {currentPlayer && (
            <div className={cn(
              "rounded-xl p-3 shadow-lg border-2 transition-all duration-500",
              isCurrentUser 
                ? "bg-gradient-to-r from-purple-100 via-pink-50 to-purple-100 border-purple-300" 
                : "bg-gradient-to-r from-gray-100 to-gray-50 border-gray-200"
            )}>
              <p className={cn(
                "text-lg font-bold transition-all duration-300 text-center",
                isCurrentUser ? "text-purple-700" : "text-gray-700"
              )}>
                {isCurrentUser ? 
                  (isSinglePlayer ? "🎯 Din tur!" : "🎉 Din tur!") : 
                  `🎮 ${currentPlayer.name}s tur`
                }
              </p>
            </div>
          )}

          {/* Syllable reminder card - always visible */}
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl p-4 shadow-lg border border-yellow-300">
            <p className="text-center text-lg font-bold text-orange-800">
              💡 Dit ord skal indeholde: <span className="text-2xl font-black text-orange-900">{game.current_syllable}</span>
            </p>
          </div>
          
          {/* Word input - prominently placed */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-xl border-2 border-purple-300">
            <WordInput
              onSubmit={onWordSubmit}
              disabled={!isCurrentUser || timeLeft <= 0}
              currentSyllable={game.current_syllable || ''}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Compact player list */}
          <div className="transform transition-all duration-300">
            <PlayerList 
              players={players} 
              currentPlayerId={game.current_player_id || undefined}
              currentUserId={currentUserId}
            />
          </div>
          
          {/* Compact game stats */}
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-xl p-4 shadow-lg border border-indigo-200">
            <h4 className="font-bold text-indigo-800 mb-3 flex items-center text-sm">
              <span className="text-lg mr-2">📊</span>
              Spil statistik
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-white/50 rounded">
                <span className="text-gray-600">Runde:</span>
                <span className="font-bold text-indigo-700">{game.round_number || 1}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/50 rounded">
                <span className="text-gray-600">Ord:</span>
                <span className="font-bold text-indigo-700">{game.used_words?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Used words - collapsible */}
          {game.used_words && game.used_words.length > 0 && (
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 shadow-lg border border-gray-200">
              <h3 className="font-bold text-base mb-3 text-gray-800 flex items-center justify-center">
                📝 Brugte ord ({game.used_words.length})
              </h3>
              <div className="flex flex-wrap gap-2 justify-center max-h-24 overflow-y-auto">
                {game.used_words.slice(-6).map((word, index) => (
                  <span 
                    key={index} 
                    className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-medium shadow-md border border-blue-200"
                  >
                    {word}
                  </span>
                ))}
                {game.used_words.length > 6 && (
                  <span className="text-gray-500 text-sm px-2">+{game.used_words.length - 6} mere</span>
                )}
              </div>
            </div>
          )}
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
                    ? "bg-gradient-to-r from-purple-100 via-pink-50 to-purple-100 border-purple-300" 
                    : "bg-gradient-to-r from-gray-100 to-gray-50 border-gray-200"
                )}>
                  <p className={cn(
                    "text-xl font-bold transition-all duration-300",
                    isCurrentUser ? "text-purple-700" : "text-gray-700"
                  )}>
                    {isCurrentUser ? 
                      (isSinglePlayer ? "🎯 Din tur!" : "🎉 Din tur!") : 
                      `🎮 ${currentPlayer.name}s tur`
                    }
                  </p>
                </div>
              )}
              
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-200 transform hover:shadow-2xl transition-all duration-300">
                <WordInput
                  onSubmit={onWordSubmit}
                  disabled={!isCurrentUser || timeLeft <= 0}
                  currentSyllable={game.current_syllable || ''}
                  isSubmitting={isSubmitting}
                />
              </div>

              {game.used_words && game.used_words.length > 0 && (
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 shadow-lg border border-gray-200 animate-fade-in">
                  <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center justify-center">
                    📝 Brugte ord ({game.used_words.length})
                  </h3>
                  <div className="flex flex-wrap gap-3 justify-center max-h-32 overflow-y-auto">
                    {game.used_words.map((word, index) => (
                      <span 
                        key={index} 
                        className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium shadow-md border border-blue-200 hover:shadow-lg transform hover:scale-105 transition-all duration-200 animate-scale-in"
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
            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-xl p-6 shadow-xl border border-indigo-200 transform hover:scale-[1.02] transition-all duration-300">
              <h4 className="font-bold text-indigo-800 mb-4 flex items-center">
                <span className="text-2xl mr-2">📊</span>
                Spil statistik
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                  <span className="text-gray-600">Runde:</span>
                  <span className="font-bold text-indigo-700 text-lg">{game.round_number || 1}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                  <span className="text-gray-600">Ord brugt:</span>
                  <span className="font-bold text-indigo-700 text-lg">{game.used_words?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                  <span className="text-gray-600">Aktive spillere:</span>
                  <span className="font-bold text-green-600 text-lg">{players.filter(p => p.is_alive).length}</span>
                </div>
                {isSinglePlayer && (
                  <div className="flex justify-between items-center p-2 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg border border-yellow-200">
                    <span className="text-gray-600">Træning mode:</span>
                    <span className="font-bold text-orange-600">🎯 Aktiv</span>
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
