import { BombTimer } from './BombTimer';
import { PlayerList } from './PlayerList';
import { WordInput } from './WordInput';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useRef, useState } from 'react';

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
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const lastRoundRef = useRef(game.round_number);
  const [wordResult, setWordResult] = useState<'success' | 'error' | null>(null);

  // Enhanced word submit handler with animation feedback
  const handleWordSubmit = async (word: string): Promise<boolean> => {
    const success = await onWordSubmit(word);
    
    // Show result animation
    setWordResult(success ? 'success' : 'error');
    
    return success;
  };

  const handleAnimationComplete = () => {
    setWordResult(null);
  };

  // Prevent auto-scroll on mobile when new words are added
  useEffect(() => {
    if (isMobile && game.round_number !== lastRoundRef.current) {
      // Keep the current scroll position when round changes
      const currentScrollY = window.scrollY;
      
      // Use setTimeout to restore scroll position after DOM updates
      setTimeout(() => {
        window.scrollTo(0, currentScrollY);
      }, 100);
      
      lastRoundRef.current = game.round_number || 1;
    }
  }, [game.round_number, isMobile]);

  return (
    <div 
      ref={gameContainerRef}
      className={cn(
        "gap-8 animate-fade-in",
        isMobile ? "flex flex-col space-y-8" : "grid grid-cols-1 lg:grid-cols-3"
      )}
    >
      <div className={cn(
        "space-y-24",
        isMobile ? "order-1" : "lg:col-span-2"
      )}>
        <div className="text-center relative mt-12">
          <div className="relative z-20">
            <BombTimer
              timeLeft={timeLeft}
              totalTime={game.timer_duration || 15}
              isActive={game.status === 'playing'}
              syllable={game.current_syllable || ''}
              wordResult={wordResult}
              onAnimationComplete={handleAnimationComplete}
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
              onSubmit={handleWordSubmit}
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
              <div 
                className="flex flex-wrap gap-3 justify-center max-h-32 overflow-y-auto"
                style={{
                  // Prevent scroll jumping on mobile
                  scrollBehavior: isMobile ? 'auto' : 'smooth'
                }}
              >
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

      <div className={cn(
        "space-y-6",
        isMobile ? "order-2" : ""
      )}>
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
    </div>
  );
};
