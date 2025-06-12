import { BombTimer } from './BombTimer';
import { PlayerList } from './PlayerList';
import { WordInput } from './WordInput';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="text-center relative">
          {/* Decorative elements around the bomb timer */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce animation-delay-500"></div>
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce animation-delay-1000"></div>
            </div>
          </div>
          
          <BombTimer
            timeLeft={timeLeft}
            totalTime={game.timer_duration || 15}
            isActive={game.status === 'playing'}
            syllable={game.current_syllable || ''}
          />
        </div>

        <div className="text-center space-y-6">
          {currentPlayer && (
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6 shadow-lg border border-purple-200">
              <p className={cn(
                "text-2xl font-bold transition-all duration-300",
                isCurrentUser ? "text-purple-700 animate-pulse" : "text-gray-700"
              )}>
                {isCurrentUser ? 
                  (isSinglePlayer ? "🎯 Find et ord!" : "🎉 Din tur!") : 
                  `🎮 ${currentPlayer.name}s tur`
                }
              </p>
              {isCurrentUser && (
                <p className="text-purple-600 mt-2 font-medium">
                  Skriv et ord der indeholder "{game.current_syllable}"
                </p>
              )}
            </div>
          )}
          
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <WordInput
              onSubmit={onWordSubmit}
              disabled={!isCurrentUser || timeLeft <= 0}
              currentSyllable={game.current_syllable || ''}
              isSubmitting={isSubmitting}
            />
          </div>

          {game.used_words && game.used_words.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-6 shadow-inner border border-gray-200">
              <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center justify-center">
                📝 Brugte ord
              </h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {game.used_words.map((word, index) => (
                  <span 
                    key={index} 
                    className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-medium shadow-sm border border-blue-200 hover:shadow-md transition-all duration-200"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <PlayerList 
          players={players} 
          currentPlayerId={game.current_player_id || undefined}
          currentUserId={currentUserId}
        />
        
        {/* Game stats card */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 shadow-lg border border-indigo-200">
          <h4 className="font-semibold text-indigo-800 mb-2">🎮 Spil statistik</h4>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600">Runde: <span className="font-medium text-indigo-700">{game.round_number || 1}</span></p>
            <p className="text-gray-600">Ord brugt: <span className="font-medium text-indigo-700">{game.used_words?.length || 0}</span></p>
            <p className="text-gray-600">Aktive spillere: <span className="font-medium text-green-600">{players.filter(p => p.is_alive).length}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};
