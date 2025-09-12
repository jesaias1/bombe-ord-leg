import React from 'react';
import { Heart, Crown } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type Player = Tables<'players'>;

interface PlayersRailProps {
  players: Player[];
  currentPlayerId?: string;
  currentUserId?: string;
}

export const PlayersRail = ({ players, currentPlayerId, currentUserId }: PlayersRailProps) => {
  const alivePlayers = players.filter(p => p.is_alive);
  
  return (
    <div className="w-full bg-gray-900/50 backdrop-blur-sm border-t border-gray-700">
      <div className="flex flex-wrap items-center justify-center gap-2 px-2 overflow-x-auto no-scrollbar p-2">
        {alivePlayers.map((player) => {
          const isCurrentPlayer = player.id === currentPlayerId;
          const isCurrentUser = player.user_id === currentUserId;
          
          return (
            <div
              key={player.id}
              className={cn(
                "flex-shrink-0 flex flex-col items-center space-y-1 p-2 rounded-lg transition-all duration-300",
                isCurrentPlayer 
                  ? "bg-yellow-500/20 border-2 border-yellow-400 shadow-lg shadow-yellow-400/20" 
                  : "bg-gray-800/50 border border-gray-600"
              )}
            >
              {/* Player Avatar */}
              <div className="relative">
                <div className={cn(
                  "w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all duration-300",
                  isCurrentPlayer
                    ? "bg-yellow-500 border-yellow-300 scale-105"
                    : "bg-gray-700 border-gray-500"
                )}>
                  <span className="text-white font-bold text-sm">
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                {/* Crown for current user */}
                {isCurrentUser && (
                  <Crown className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400" />
                )}
              </div>
              
              {/* Player Name */}
              <div className={cn(
                "px-2 py-1 rounded text-xs font-medium whitespace-nowrap max-w-[60px] truncate",
                isCurrentPlayer 
                  ? "bg-yellow-600 text-white" 
                  : "bg-gray-600 text-gray-200"
              )}>
                {player.name}
              </div>
              
              {/* Lives (Hearts) */}
              <div className="flex space-x-0.5">
                {Array.from({ length: player.lives }).map((_, i) => (
                  <Heart key={i} className="w-3 h-3 text-red-500 fill-current" />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};