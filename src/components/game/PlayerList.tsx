
import { cn } from '@/lib/utils';
import { ArrowRight, Heart } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  lives: number;
  is_alive: boolean;
  user_id: string | null;
}

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string;
  currentUserId?: string;
}

export const PlayerList = ({ players, currentPlayerId, currentUserId }: PlayerListProps) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <h3 className="font-bold text-xl mb-4 text-gray-800 text-center">Spillere</h3>
      <div className="space-y-3">
        {players.map((player, index) => (
          <div
            key={player.id}
            className={cn(
              "relative flex items-center justify-between p-4 rounded-xl transition-all duration-500 border-2",
              currentPlayerId === player.id && [
                "bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white shadow-xl",
                "border-yellow-400",
                "transform scale-105",
                "animate-pulse"
              ],
              currentPlayerId !== player.id && !player.is_alive && "opacity-60 bg-gray-50 border-gray-200",
              currentPlayerId !== player.id && player.is_alive && "bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200",
              player.user_id === currentUserId && currentPlayerId !== player.id && "ring-2 ring-green-400 border-green-300"
            )}
            style={currentPlayerId === player.id ? {
              animationDuration: '2s',
              animationIterationCount: 'infinite'
            } : {}}
          >
            {/* Arrow pointing to current player */}
            {currentPlayerId === player.id && (
              <div className="absolute -left-6 top-1/2 transform -translate-y-1/2">
                <ArrowRight 
                  size={24} 
                  className="text-yellow-400 animate-bounce drop-shadow-lg" 
                />
              </div>
            )}

            {/* Hearts animation for current player */}
            {currentPlayerId === player.id && (
              <>
                <div className="absolute -top-2 left-4 animate-bounce animation-delay-500">
                  <Heart size={16} className="text-red-400 fill-current drop-shadow-sm" />
                </div>
                <div className="absolute -top-1 right-8 animate-bounce animation-delay-1000">
                  <Heart size={12} className="text-pink-400 fill-current drop-shadow-sm" />
                </div>
                <div className="absolute -top-2 right-16 animate-bounce animation-delay-1500">
                  <Heart size={14} className="text-red-300 fill-current drop-shadow-sm" />
                </div>
              </>
            )}

            <div className="flex items-center space-x-4 z-10 relative">
              <div className={cn(
                "w-5 h-5 rounded-full transition-all duration-300 shadow-md",
                currentPlayerId === player.id && "w-6 h-6 bg-yellow-300 shadow-lg animate-pulse",
                currentPlayerId !== player.id && player.is_alive && "bg-green-400",
                !player.is_alive && "bg-red-400"
              )} />
              <span className={cn(
                "font-semibold transition-all duration-300",
                currentPlayerId === player.id && "font-bold text-white text-lg drop-shadow-md",
                currentPlayerId !== player.id && player.is_alive && "text-gray-700",
                !player.is_alive && "line-through text-gray-500"
              )}>
                {player.name}
                {player.user_id === currentUserId && " (dig)"}
                {currentPlayerId === player.id && " 🎯"}
              </span>
            </div>
            
            <div className="flex items-center space-x-1 z-10 relative">
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 transition-all duration-300 shadow-sm",
                    currentPlayerId === player.id && "w-6 h-6 shadow-md animate-pulse",
                    i < player.lives ? "bg-red-400 border-red-500" : "bg-gray-200 border-gray-300",
                    currentPlayerId === player.id && i < player.lives && "bg-red-300 border-red-400"
                  )}
                />
              ))}
            </div>

            {/* Sparkle effect for current player */}
            {currentPlayerId === player.id && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-2 left-8 w-1 h-1 bg-yellow-200 rounded-full animate-ping"></div>
                <div className="absolute bottom-3 right-12 w-1 h-1 bg-white rounded-full animate-ping animation-delay-1000"></div>
                <div className="absolute top-6 right-4 w-1 h-1 bg-yellow-100 rounded-full animate-ping animation-delay-2000"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
