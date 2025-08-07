
import React from 'react';
import { WordInput } from './WordInput';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { Heart, Skull, Crown } from 'lucide-react';

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
  const alivePlayers = players.filter(p => p.is_alive);
  const deadPlayers = players.filter(p => !p.is_alive);
  
  // Calculate positions for players around the screen
  const getPlayerPosition = (index: number, total: number) => {
    if (total === 1) {
      // For single player, position at the top but closer to center
      return { x: 0, y: -120, angle: 0 };
    }
    const angle = (index * 360) / total - 90; // Start from top
    const radius = Math.min(window.innerHeight * 0.3, window.innerWidth * 0.3);
    const x = Math.cos((angle * Math.PI) / 180) * radius;
    const y = Math.sin((angle * Math.PI) / 180) * radius;
    return { x, y, angle };
  };

  // Find the current player's position for arrow rotation
  const currentPlayerIndex = alivePlayers.findIndex(p => p.id === game.current_player_id);
  const currentPlayerPosition = currentPlayerIndex >= 0 ? 
    getPlayerPosition(currentPlayerIndex, alivePlayers.length) : null;

  const renderPlayer = (player: Player, index: number) => {
    const isCurrentPlayer = player.id === game.current_player_id;
    const isCurrentUser = player.user_id === currentUserId;
    const position = getPlayerPosition(index, alivePlayers.length);
    
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
            "relative w-20 h-20 rounded-lg border-4 transition-all duration-300 flex flex-col items-center justify-center",
            isCurrentPlayer
              ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 shadow-lg shadow-yellow-400/50 scale-110"
              : "border-muted bg-background shadow-md"
          )}
        >
          {/* Player avatar icon */}
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center mb-1">
            <span className="text-xs font-bold text-muted-foreground">
              👤
            </span>
          </div>
          
          {/* Crown for current user */}
          {isCurrentUser && (
            <Crown className="absolute -top-3 -right-3 w-6 h-6 text-yellow-500 drop-shadow-sm" />
          )}
        </div>
        
        {/* Player name */}
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 text-center min-w-max">
          <p className={cn(
            "text-sm font-medium transition-colors",
            isCurrentPlayer ? "text-yellow-600 dark:text-yellow-400 font-bold" : "text-foreground"
          )}>
            {player.name}
          </p>
          
          {/* Lives display */}
          <div className="flex justify-center gap-1 mt-1">
            {Array.from({ length: player.lives }).map((_, i) => (
              <Heart 
                key={i} 
                className="w-3 h-3 text-red-500 fill-current" 
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  console.log('GamePlaying render - alivePlayers:', alivePlayers, 'currentPlayerPosition:', currentPlayerPosition);
  
  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      {/* Central Arrow System */}
      {currentPlayerPosition && alivePlayers.length >= 1 && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div 
            className="transition-all duration-700 ease-out"
            style={{
              transform: `rotate(${currentPlayerPosition.angle}deg)`,
            }}
          >
            {/* Large yellow arrow */}
            <div className="relative">
              <div className="w-32 h-2 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full shadow-lg"></div>
              <div 
                className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '16px solid #fbbf24',
                  borderTop: '12px solid transparent',
                  borderBottom: '12px solid transparent',
                  filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
                }}
              ></div>
              {/* Glowing effect */}
              <div className="absolute inset-0 w-32 h-2 bg-yellow-400 rounded-full animate-pulse opacity-60"></div>
            </div>
          </div>
        </div>
      )}

      {/* Center syllable display */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="text-center">
          <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-sm border-4 border-primary/30 flex items-center justify-center shadow-2xl">
          <div className="text-center">
            <div className="text-6xl font-bold text-primary">
              {game.current_syllable?.toUpperCase()}
            </div>
          </div>
          </div>
        </div>
      </div>
      
      {/* Alive players positioned around the center */}
      {alivePlayers.map((player, index) => renderPlayer(player, index))}
      
      {/* Dead players - small icons at bottom */}
      {deadPlayers.length > 0 && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3 z-5">
          {deadPlayers.map((player) => (
            <div key={player.id} className="relative group">
              <div className="w-10 h-10 rounded-lg border-2 border-muted-foreground/30 bg-muted/50 opacity-60 flex items-center justify-center">
                <Skull className="w-5 h-5 text-muted-foreground" />
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

      {/* Word Input - fixed at bottom */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4">
        <WordInput
          onSubmit={onWordSubmit}
          disabled={!isCurrentUser || isSubmitting}
          currentSyllable={game.current_syllable || ''}
          isSubmitting={isSubmitting}
          onWordChange={onWordChange}
        />
      </div>
    </div>
  );
};
