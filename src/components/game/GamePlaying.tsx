
import React from 'react';
import { WordInput } from './WordInput';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { Heart, Crown } from 'lucide-react';

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
  
  console.log('GamePlaying render - game:', game, 'alivePlayers:', alivePlayers);

  // Calculate player positions in a circle
  const getPlayerPosition = (index: number, total: number) => {
    if (total === 1) {
      return { x: 50, y: 25 };
    }
    
    const angle = (index * 360) / total - 90; // Start from top
    const radius = 40; // Distance from center
    const x = 50 + Math.cos((angle * Math.PI) / 180) * radius;
    const y = 50 + Math.sin((angle * Math.PI) / 180) * radius;
    return { x, y };
  };

  // Find current player for arrow direction
  const currentPlayerIndex = alivePlayers.findIndex(p => p.id === game.current_player_id);

  return (
    <div className="min-h-screen bg-gray-800 relative overflow-hidden">
      {/* Game Area */}
      <div className="absolute inset-0 flex items-center justify-center">
        
        {/* Central Syllable Circle */}
        <div className="relative z-10">
          <div className="w-32 h-32 bg-gray-900 rounded-full border-4 border-gray-600 flex items-center justify-center shadow-2xl">
            <span className="text-4xl font-bold text-white tracking-wider">
              {game.current_syllable?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Players positioned around the circle */}
        {alivePlayers.map((player, index) => {
          const position = getPlayerPosition(index, alivePlayers.length);
          const isCurrentPlayer = player.id === game.current_player_id;
          const isCurrentUserPlayer = player.user_id === currentUserId;
          
          return (
            <div
              key={player.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
              }}
            >
              <div className="flex flex-col items-center space-y-2">
                {/* Player Avatar */}
                <div className="relative">
                  <div className="w-16 h-16 bg-gray-700 rounded-lg border-2 border-gray-500 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {player.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {/* Crown for current user */}
                  {isCurrentUserPlayer && (
                    <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400" />
                  )}
                </div>
                
                {/* Player Name */}
                <div className={cn(
                  "px-3 py-1 rounded text-sm font-medium",
                  isCurrentPlayer 
                    ? "bg-yellow-600 text-white" 
                    : "bg-gray-600 text-gray-200"
                )}>
                  {player.name}
                </div>
                
                {/* Lives (Hearts) */}
                <div className="flex space-x-1">
                  {Array.from({ length: player.lives }).map((_, i) => (
                    <Heart key={i} className="w-4 h-4 text-red-500 fill-current" />
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* Arrow pointing to current player */}
        {currentPlayerIndex >= 0 && alivePlayers.length > 1 && (
          <div className="absolute z-20">
            {(() => {
              const currentPos = getPlayerPosition(currentPlayerIndex, alivePlayers.length);
              const angle = Math.atan2(currentPos.y - 50, currentPos.x - 50) * 180 / Math.PI;
              
              return (
                <div
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) rotate(${angle + 90}deg)`,
                  }}
                >
                  <div 
                    className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[16px] border-l-transparent border-r-transparent border-b-yellow-400"
                    style={{ marginTop: '-80px' }}
                  />
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Bottom Status and Input */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900 p-4">
        <div className="text-center mb-4">
          <span className="text-gray-300">
            {currentPlayer ? `${currentPlayer.name} is up.` : 'Waiting...'}
          </span>
        </div>
        
        <div className="max-w-md mx-auto">
          <WordInput
            onSubmit={onWordSubmit}
            disabled={!isCurrentUser || isSubmitting}
            currentSyllable={game.current_syllable || ''}
            isSubmitting={isSubmitting}
            onWordChange={onWordChange}
          />
        </div>
      </div>

      {/* Eliminated Players */}
      {deadPlayers.length > 0 && (
        <div className="absolute top-4 right-4 bg-gray-900 rounded-lg p-3">
          <div className="text-gray-400 text-xs mb-2">Eliminated</div>
          <div className="space-y-1">
            {deadPlayers.map((player) => (
              <div key={player.id} className="text-gray-500 text-sm line-through">
                {player.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
