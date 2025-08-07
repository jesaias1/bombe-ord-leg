import React from 'react';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { Crown, Heart } from 'lucide-react';

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
    const radius = Math.min(120, 80 + total * 8); // Adaptive radius based on player count
    const x = Math.cos((angle * Math.PI) / 180) * radius;
    const y = Math.sin((angle * Math.PI) / 180) * radius;
    return { x, y, angle };
  };

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
        {/* Turn indicator arrow */}
        {isCurrentPlayer && isAlive && (
          <div 
            className="absolute pointer-events-none transition-all duration-300 animate-pulse"
            style={{
              transform: `rotate(${position.angle + 90}deg)`,
              top: '-40px',
              left: '50%',
              marginLeft: '-12px'
            }}
          >
            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg">
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-current"></div>
            </div>
          </div>
        )}
        
        {/* Player avatar */}
        <div
          className={cn(
            "relative w-16 h-16 rounded-full border-4 transition-all duration-300 flex items-center justify-center",
            isCurrentPlayer && isAlive
              ? "border-primary bg-primary/10 shadow-lg scale-110"
              : isAlive
              ? "border-muted bg-background shadow-md"
              : "border-muted-foreground/30 bg-muted/50 opacity-60",
            isCurrentUser && "ring-2 ring-blue-500 ring-offset-2"
          )}
        >
          {/* Player initials */}
          <span className={cn(
            "text-sm font-semibold",
            isCurrentPlayer && isAlive ? "text-primary" : "text-foreground"
          )}>
            {player.name.slice(0, 2).toUpperCase()}
          </span>
          
          {/* Crown for current user */}
          {isCurrentUser && (
            <Crown className="absolute -top-2 -right-2 w-4 h-4 text-yellow-500" />
          )}
        </div>
        
        {/* Player name */}
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 text-center min-w-max">
          <p className={cn(
            "text-xs font-medium transition-colors",
            isCurrentPlayer && isAlive ? "text-primary" : "text-foreground"
          )}>
            {player.name}
          </p>
          
          {/* Lives display */}
          {isAlive && (
            <div className="flex justify-center gap-1 mt-1">
              {Array.from({ length: player.lives }).map((_, i) => (
                <Heart 
                  key={i} 
                  className="w-3 h-3 text-red-500 fill-current" 
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
    <div className="relative w-full h-80 flex items-center justify-center">
      {/* Center game info */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-muted/50 backdrop-blur-sm border-2 border-muted flex items-center justify-center">
            <span className="text-2xl font-bold text-muted-foreground">
              {alivePlayers.length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {isSinglePlayer ? "Øv dig" : `${alivePlayers.length} tilbage`}
          </p>
        </div>
      </div>
      
      {/* Alive players */}
      {alivePlayers.map((player, index) => renderPlayer(player, index, true))}
      
      {/* Dead players - smaller and positioned below */}
      {deadPlayers.length > 0 && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-2">
          {deadPlayers.map((player, index) => (
            <div key={player.id} className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-muted-foreground/30 bg-muted/50 opacity-60 flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground">
                  {player.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1 absolute top-full left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                {player.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};