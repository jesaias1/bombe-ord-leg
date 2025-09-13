
import React, { useEffect, useState } from 'react';
import { WordInput } from './WordInput';
import { BombTimer } from './BombTimer';
import { PlayersRail } from './PlayersRail';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { Heart, Crown } from 'lucide-react';
import { useGameInput } from '@/hooks/useGameInput';
import { useServerClock } from '@/hooks/useServerClock';
import './GameBoard.css';
import './mobile-game-layout.css';
import '@/styles/ob-responsive.css';

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
  const { offsetMs } = useServerClock();
  const [tick, setTick] = useState(0);
  
  console.log('GamePlaying render - game:', game, 'alivePlayers:', alivePlayers);

  // Fast-forward UI if late (drift correction)
  useEffect(() => {
    if (!game?.timer_end_time) return;
    const end = new Date(game.timer_end_time).getTime();
    const left = end - (Date.now() + offsetMs);

    // If we are behind by > 600ms (network lag), force immediate re-render
    if (left < -600) {
      setTick((t) => t + 1);
    }
  }, [game?.timer_end_time, offsetMs]);

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
    <div className="ob-layout game-screen min-h-screen bg-gray-800 relative overflow-hidden">
      {/* Content column */}
      <div className="ob-content game-content play-stack absolute inset-0 flex items-center justify-center">
        
        {/* Safe area wrapper with padding to prevent UI overlap */}
        <div className="game-stage relative flex w-full flex-col items-center justify-center">
          {/* Player badges positioning */}
          <div className="player-badges">
            {/* Placeholder for consistency - actual badges rendered separately */}
          </div>
          
          {/* Turn chip with proper wrapper */}
          <div className="ob-turn-chip game-status-chip mx-auto mt-2 mb-2 inline-block z-40">
            <div className="turn-chip pointer-events-none">
              <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-black/70 text-white text-xs md:text-sm px-3 py-1 shadow">
                {currentPlayer ? `${currentPlayer.name} er på tur` : 'Venter...'}
              </span>
            </div>
          </div>
          
          {/* Timer wrapper with mobile spacing to prevent overlap */}
          <div className="ob-timer-area game-timer-wrap mb-[132px] sm:mb-6 z-30">
            <div className="timer-wrap">
              <div className="ob-timer-circle timer-circle mx-auto flex items-center justify-center">
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

        {/* Players positioned around the bomb (orbit on desktop, rail on mobile) */}
        <div className="ob-players-rail ob-players-rail--top game-orbit-layer players-rail">
          {alivePlayers.map((player, index) => {
            const position = getPlayerPosition(index, alivePlayers.length);
            const isCurrentPlayer = player.id === game.current_player_id;
            const isCurrentUserPlayer = player.user_id === currentUserId;
            
            return (
              <div
                key={player.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 player-badge"
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
        </div>

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


        {/* Input Area */}
        <div className="ob-input-area">
          <div className="game-input-panel max-w-md mx-auto">
          {/* Game status and spectator mode indicator - compact chips only */}
          {(() => {
            const currentUserPlayer = players.find(p => p.user_id === currentUserId);
            const isSpectating = currentUserPlayer && !currentUserPlayer.is_alive;
            const isCurrentUserTurn = isCurrentUser && currentUserPlayer?.is_alive;
            
            if (isSpectating) {
              return (
                <div className="text-center mb-4">
                  <div className="relative z-[30] mt-2 md:mt-3 bg-purple-600 text-white px-4 py-2 rounded-lg inline-block shadow-lg">
                    👀 Du er ude - du ser med som tilskuer
                  </div>
                </div>
              );
            } else if (isCurrentUserTurn) {
              return (
                <div className="text-center mb-4">
                  <div className="relative z-[30] mt-2 md:mt-3 bg-yellow-600 text-white px-4 py-2 rounded-lg inline-block shadow-lg">
                    🎯 Din tur!
                  </div>
                </div>
              );
            } else {
              return null; // No additional message needed - turn info is in chip above timer
            }
          })()}
        
            <div className="word-input">
              <WordInput
                onSubmit={gameInput.handleWordSubmit}
                disabled={!gameInput.canInput}
                currentSyllable={gameInput.currentSyllable || ''}
                isSubmitting={gameInput.isSubmitting}
                currentWord={gameInput.currentWord}
                onWordChange={gameInput.setCurrentWord}
                inputRef={gameInput.inputRef}
              />
            </div>
            
            {/* Helper text inside footer on mobile */}
            <div className="ob-helper">Find ord med "{game.current_syllable}"</div>
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
