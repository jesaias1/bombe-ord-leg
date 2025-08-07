import React from 'react';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type Player = Tables<'players'>;

interface TurnIndicatorProps {
  currentPlayer?: Player;
  isCurrentUser: boolean;
  isSinglePlayer?: boolean;
}

export const TurnIndicator = ({ 
  currentPlayer, 
  isCurrentUser,
  isSinglePlayer = false 
}: TurnIndicatorProps) => {
  if (!currentPlayer) return null;

  return (
    <div className="text-center py-4">
      <div className={cn(
        "inline-flex items-center gap-3 px-6 py-3 rounded-full transition-all duration-300",
        isCurrentUser 
          ? "bg-primary text-primary-foreground shadow-lg animate-pulse"
          : "bg-muted border-2 border-muted-foreground/20"
      )}>
        {/* Turn indicator arrow */}
        <div className={cn(
          "w-3 h-3 rounded-full transition-colors",
          isCurrentUser ? "bg-primary-foreground" : "bg-primary"
        )}>
          <div className={cn(
            "w-full h-full rounded-full animate-ping",
            isCurrentUser ? "bg-primary-foreground" : "bg-primary"
          )}></div>
        </div>
        
        <span className="font-semibold">
          {isCurrentUser 
            ? (isSinglePlayer ? "Din tur" : "Din tur!") 
            : `${currentPlayer.name}s tur`
          }
        </span>
        
        {/* Lives indicator */}
        <div className="flex gap-1">
          {Array.from({ length: currentPlayer.lives }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "w-2 h-2 rounded-full",
                isCurrentUser ? "bg-primary-foreground" : "bg-red-500"
              )}
            />
          ))}
        </div>
      </div>
      
      {/* Dramatic turn transition message */}
      {isCurrentUser && !isSinglePlayer && (
        <p className="text-sm text-muted-foreground mt-2 animate-fade-in">
          🎯 Find et ord med "{currentPlayer.name}" stavelsen!
        </p>
      )}
    </div>
  );
};