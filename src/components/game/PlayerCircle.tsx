import React from 'react';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { Crown, Heart, Skull } from 'lucide-react';

type Player = Tables<'players'>;

interface PlayerCircleProps {
  players: Player[];
  currentPlayerId?: string;
  currentUserId?: string;
  isSinglePlayer?: boolean;
}

export const PlayerCircle = ({ 
  players, 
  currentPlayerId, 
  currentUserId,
  isSinglePlayer = false 
}: PlayerCircleProps) => {
  const alivePlayers = players.filter(p => p.is_alive);
  const deadPlayers = players.filter(p => !p.is_alive);
  
  // Calculate positions for players in a circle
  const getPlayerPosition = (index: number, total: number) => {
    const angle = (index * 360) / total - 90; // Start from top
    const radius = Math.min(140, 100 + total * 6); // Adaptive radius based on player count
    const x = Math.cos((angle * Math.PI) / 180) * radius;
    const y = Math.sin((angle * Math.PI) / 180) * radius;
    return { x, y, angle };
  };

  // Find the current player's position for arrow rotation
  const currentPlayerIndex = alivePlayers.findIndex(p => p.id === currentPlayerId);
  const currentPlayerPosition = currentPlayerIndex >= 0 ? 
    getPlayerPosition(currentPlayerIndex, alivePlayers.length) : null;

  const renderPlayer = (player: Player, index: number, isAlive: boolean) => {
    const isCurrentPlayer = player.id === currentPlayerId;
    const isCurrentUser = player.user_id === currentUserId;
    const position = getPlayerPosition(index, isAlive ? alivePlayers.length : deadPlayers.length);
    
    return (
      <div
        key={player.id}
        className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
        style={{
          left: `calc(50% + ${position.x}px)`,
          top: `calc(50% + ${position.y}px)`,
        }}
      >
        {/* Player avatar */}
        <div
          className={cn(
            "relative w-16 h-16 rounded-full border-4 transition-all duration-300 flex items-center justify-center",
            isCurrentPlayer && isAlive
              ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 shadow-lg shadow-yellow-400/50 scale-110 animate-pulse"
              : isAlive
              ? "border-muted bg-background shadow-md hover:scale-105"
              : "border-muted-foreground/30 bg-muted/50 opacity-60",
            isCurrentUser && isAlive && "ring-4 ring-blue-500 ring-offset-2"
          )}
        >
          {/* Player initials or icon */}
          {isAlive ? (
            <span className={cn(
              "text-sm font-bold",
              isCurrentPlayer ? "text-yellow-700 dark:text-yellow-300" : "text-foreground"
            )}>
              {player.name.slice(0, 2).toUpperCase()}
            </span>
          ) : (
            <Skull className="w-6 h-6 text-muted-foreground" />
          )}
          
          {/* Crown for current user */}
          {isCurrentUser && isAlive && (
            <Crown className="absolute -top-2 -right-2 w-5 h-5 text-yellow-500 drop-shadow-sm" />
          )}
        </div>
        
        {/* Player name */}
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 text-center min-w-max">
          <p className={cn(
            "text-xs font-medium transition-colors",
            isCurrentPlayer && isAlive ? "text-yellow-600 dark:text-yellow-400 font-bold" : "text-foreground"
          )}>
            {player.name}
          </p>
          
          {/* Lives display */}
          {isAlive && (
            <div className="flex justify-center gap-1 mt-1">
              {Array.from({ length: player.lives }).map((_, i) => (
                <Heart 
                  key={i} 
                  className="w-3 h-3 text-red-500 fill-current drop-shadow-sm" 
                />
              ))}
            </div>
          )}
          
          {/* Eliminated badge */}
          {!isAlive && (
            <div className="mt-1">
              <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full">
                Elimineret
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-96 flex items-center justify-center">
      {/* Central Arrow System - Large prominent arrow pointing to current player */}
      {currentPlayerPosition && alivePlayers.length > 1 && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div 
            className="transition-all duration-700 ease-out"
            style={{
              transform: `rotate(${currentPlayerPosition.angle}deg)`,
            }}
          >
            {/* Large arrow pointing outward */}
            <div className="relative">
              <div className="w-20 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full shadow-lg"></div>
              <div 
                className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '12px solid #fbbf24',
                  borderTop: '8px solid transparent',
                  borderBottom: '8px solid transparent',
                  filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
                }}
              ></div>
              {/* Glowing effect */}
              <div className="absolute inset-0 w-20 h-1 bg-yellow-400 rounded-full animate-pulse opacity-60"></div>
            </div>
          </div>
        </div>
      )}

      {/* Center game info */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-sm border-2 border-primary/30 flex items-center justify-center shadow-lg">
            {isSinglePlayer ? (
              <div className="text-center">
                <div className="text-lg font-bold text-primary">TRÆN</div>
                <div className="text-xs text-muted-foreground">MODE</div>
              </div>
            ) : (
              <div className="text-center">
                <span className="text-xl font-bold text-primary">
                  {alivePlayers.length}
                </span>
                <div className="text-xs text-muted-foreground">tilbage</div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Alive players */}
      {alivePlayers.map((player, index) => renderPlayer(player, index, true))}
      
      {/* Dead players - smaller and positioned below */}
      {deadPlayers.length > 0 && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-3 z-5">
          {deadPlayers.map((player, index) => (
            <div key={player.id} className="relative group">
              <div className="w-8 h-8 rounded-full border-2 border-muted-foreground/30 bg-muted/50 opacity-60 flex items-center justify-center hover:opacity-80 transition-opacity">
                <Skull className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {player.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};