
import React from 'react';
import { WordInput } from './WordInput';
import { BombTimer } from './BombTimer';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { Heart, Crown } from 'lucide-react';
import { useGameInput } from '@/hooks/useGameInput';

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
  gameInput: ReturnType<typeof useGameInput>;
}

export const GamePlaying = ({
  game,
  players,
  timeLeft,
  currentPlayer,
  isCurrentUser,
  isSinglePlayer,
  currentUserId,
  gameInput
}: GamePlayingProps) => {
  const alivePlayers = players.filter(p => p.is_alive);
  const deadPlayers = players.filter(p => !p.is_alive);
  
  console.log('GamePlaying render - game:', game, 'alivePlayers:', alivePlayers);

  // Calculate player positions in a circle (smaller radius)
  const getPlayerPosition = (index: number, total: number) => {
    if (total === 1) {
      return { x: 50, y: 30 };
    }
    
    const angle = (index * 360) / total - 90; // Start from top
    const radius = 30; // Smaller radius for compact layout
    const x = 50 + Math.cos((angle * Math.PI) / 180) * radius;
    const y = 50 + Math.sin((angle * Math.PI) / 180) * radius;
    return { x, y };
  };

  // Find current player for arrow direction
  const currentPlayerIndex = alivePlayers.findIndex(p => p.id === game.current_player_id);

  return (
    <div className="min-h-screen bg-gray-800 relative overflow-hidden">
      {/* Game Area - responsive layout to prevent overlap */}
      <div className="absolute inset-0 flex items-center justify-center">
        
        {/* Responsive wrapper for timer - prevents overlap with player hearts */}
        <div className="relative flex w-full flex-col items-center justify-center">
          {/* Timer wrapper with size constraints */}
          <div className="relative z-10">
            <div className="mx-auto flex items-center justify-center">
              {/* Size clamps prevent the circle from growing into player hearts */}
              <div className="relative w-[clamp(120px,28vw,200px)] h-[clamp(120px,28vw,200px)]">
                <BombTimer
                  timeLeft={timeLeft}
                  totalTime={game.timer_duration || 15}
                  isActive={game.status === 'playing'}
                  syllable={game.current_syllable || ''}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Players positioned around the bomb (closer) */}
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
              <div className="flex flex-col items-center space-y-1">
                {/* Player Avatar - smaller */}
                <div className="relative">
                  <div className={cn(
                    "w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all duration-300",
                    isCurrentPlayer
                      ? "bg-yellow-500 border-yellow-300 scale-110 animate-pulse shadow-lg shadow-yellow-400/50"
                      : "bg-gray-700 border-gray-500"
                  )}>
                    <span className="text-white font-bold text-sm">
                      {player.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {/* Crown for current user */}
                  {isCurrentUserPlayer && (
                    <Crown className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400" />
                  )}
                </div>
                
                {/* Player Name - smaller */}
                <div className={cn(
                  "px-2 py-1 rounded text-xs font-medium whitespace-nowrap",
                  isCurrentPlayer 
                    ? "bg-yellow-600 text-white shadow-md" 
                    : "bg-gray-600 text-gray-200"
                )}>
                  {player.name}
                </div>
                
                {/* Lives (Hearts) - smaller */}
                <div className="flex space-x-0.5">
                  {Array.from({ length: player.lives }).map((_, i) => (
                    <Heart key={i} className="w-3 h-3 text-red-500 fill-current" />
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
                    className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent border-b-yellow-400 animate-bounce"
                    style={{ marginTop: '-65px' }}
                  />
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Bottom Status and Input */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900 p-4">
        {/* Spectator mode indicator */}
        {(() => {
          const currentUserPlayer = players.find(p => p.user_id === currentUserId);
          const isSpectating = currentUserPlayer && !currentUserPlayer.is_alive;
          
          return isSpectating ? (
            <div className="text-center mb-4">
              <div className="bg-purple-600 text-white px-4 py-2 rounded-lg inline-block">
                👀 Du er ude - du ser med som tilskuer
              </div>
            </div>
          ) : (
            <div className="text-center mb-4">
              <span className="text-gray-300">
                {currentPlayer ? `${currentPlayer.name} is up.` : 'Waiting...'}
              </span>
            </div>
          );
        })()}
        
        <div className="max-w-md mx-auto">
          <WordInput
            onSubmit={gameInput.handleWordSubmit}
            disabled={!gameInput.canInput}
            currentSyllable={game.current_syllable || ''}
            isSubmitting={gameInput.isSubmitting}
            currentWord={gameInput.currentWord}
            onWordChange={gameInput.setCurrentWord}
            inputRef={gameInput.inputRef}
          />
          {/* Debug info */}
          <div className="mt-2 text-xs text-gray-400 text-center">
            Debug: canInput={gameInput.canInput ? 'YES' : 'NO'}, disabled={!gameInput.canInput ? 'YES' : 'NO'}, syllable="{game.current_syllable}"
          </div>
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
