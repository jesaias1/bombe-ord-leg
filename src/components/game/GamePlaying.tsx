
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
      {/* Mobile simplified layout - keyboard friendly */}
      {isMobile ? (
        <div className="h-screen flex flex-col justify-between p-4 max-h-[100dvh]">
          {/* Top section - syllable and timer */}
          <div className="text-center space-y-3">
            {/* Timer - compact */}
            <div className="text-4xl font-bold">
              {timeLeft}s
            </div>
            
            {/* Syllable - prominent */}
            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-6 shadow-lg border-2 border-yellow-300">
              <p className="text-center text-sm text-orange-700 mb-1">Dit ord skal indeholde:</p>
              <p className="text-center text-4xl font-black text-orange-900">{game.current_syllable}</p>
            </div>

            {/* Current player indicator - compact */}
            {currentPlayer && (
              <div className={cn(
                "rounded-lg p-2 text-center text-sm font-bold",
                isCurrentUser ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700"
              )}>
                {isCurrentUser ? "Din tur!" : `${currentPlayer.name}s tur`}
              </div>
            )}
          </div>
          
          {/* Bottom section - input field */}
          <div className="pb-safe">
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
                  onWordChange={onWordChange}
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
