
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
  
  console.log('GamePlaying NEW render - game:', game, 'alivePlayers:', alivePlayers, 'players:', players);

  // Calculate player positions in a circle
  const getPlayerPosition = (index: number, total: number) => {
    if (total === 1) {
      return { x: 50, y: 20 }; // Single player at top
    }
    
    const angle = (index * 360) / total - 90; // Start from top
    const radius = 35; // Percentage-based radius
    const x = 50 + Math.cos((angle * Math.PI) / 180) * radius;
    const y = 50 + Math.sin((angle * Math.PI) / 180) * radius;
    return { x, y };
  };

  // Find current player for arrow direction
  const currentPlayerIndex = alivePlayers.findIndex(p => p.id === game.current_player_id);
  const currentPlayerPos = currentPlayerIndex >= 0 ? getPlayerPosition(currentPlayerIndex, alivePlayers.length) : null;

  const renderPlayer = (player: Player, index: number) => {
    const isCurrentPlayer = player.id === game.current_player_id;
    const isCurrentUserPlayer = player.user_id === currentUserId;
    const position = getPlayerPosition(index, alivePlayers.length);
    
    return (
      <div
        key={player.id}
        className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 z-20"
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
        }}
      >
        <div className="flex flex-col items-center">
          {/* Player Avatar */}
          <div
            className={cn(
              "relative w-16 h-16 rounded-xl border-3 transition-all duration-300 flex items-center justify-center",
              "bg-gradient-to-br shadow-lg",
              isCurrentPlayer
                ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/20 shadow-yellow-400/50 scale-110 animate-pulse"
                : "border-slate-300 dark:border-slate-600 from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700"
            )}
          >
            {/* Avatar Icon */}
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
              {player.name.charAt(0).toUpperCase()}
            </div>
            
            {/* Crown for current user */}
            {isCurrentUserPlayer && (
              <Crown className="absolute -top-2 -right-2 w-5 h-5 text-yellow-500 drop-shadow-md" />
            )}
          </div>
          
          {/* Player Name */}
          <div className="mt-2 text-center">
            <p className={cn(
              "text-sm font-semibold transition-colors whitespace-nowrap px-2 py-1 rounded-lg",
              isCurrentPlayer 
                ? "text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30" 
                : "text-slate-700 dark:text-slate-300"
            )}>
              {player.name}
            </p>
            
            {/* Lives */}
            <div className="flex justify-center gap-1 mt-1">
              {Array.from({ length: player.lives }).map((_, i) => (
                <Heart 
                  key={i} 
                  className="w-3 h-3 text-red-500 fill-current drop-shadow-sm" 
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Main game container */}
      <div className="relative w-full h-full flex flex-col">
        
        {/* Top section - Game info */}
        <div className="flex-none p-6 text-center">
          <div className="text-slate-300 text-sm font-medium">
            Current syllable - Find a word containing:
          </div>
        </div>

        {/* Middle section - Game area */}
        <div className="flex-1 relative flex items-center justify-center">
          
          {/* Central syllable */}
          <div className="relative z-10">
            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-slate-700/90 to-slate-800/90 border-4 border-slate-500/50 shadow-2xl flex items-center justify-center backdrop-blur-sm">
              <div className="text-5xl font-black text-white drop-shadow-lg">
                {game.current_syllable?.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Players positioned around center */}
          {alivePlayers.map((player, index) => {
            const isCurrentPlayer = player.id === game.current_player_id;
            const isCurrentUserPlayer = player.user_id === currentUserId;
            const position = getPlayerPosition(index, alivePlayers.length);
            
            return (
              <div
                key={player.id}
                className="absolute z-20"
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="flex flex-col items-center">
                  {/* Player Avatar */}
                  <div
                    className={cn(
                      "relative w-16 h-16 rounded-xl border-3 flex items-center justify-center shadow-lg transition-all duration-300",
                      isCurrentPlayer
                        ? "border-yellow-400 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/30 scale-110 animate-pulse"
                        : "border-slate-400 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800"
                    )}
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    
                    {isCurrentUserPlayer && (
                      <Crown className="absolute -top-2 -right-2 w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                  
                  {/* Player info */}
                  <div className="mt-2 text-center">
                    <div className={cn(
                      "text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap",
                      isCurrentPlayer 
                        ? "text-yellow-700 dark:text-yellow-300 bg-yellow-100/80 dark:bg-yellow-900/40" 
                        : "text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/60"
                    )}>
                      {player.name}
                    </div>
                    
                    <div className="flex justify-center gap-1 mt-1">
                      {Array.from({ length: player.lives }).map((_, i) => (
                        <Heart key={i} className="w-3 h-3 text-red-500 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Arrow pointing to current player */}
          {currentPlayerPos && alivePlayers.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-15">
              <div 
                className="absolute w-16 h-16 flex items-center justify-center transition-all duration-700"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) rotate(${
                    Math.atan2(
                      currentPlayerPos.y - 50,
                      currentPlayerPos.x - 50
                    ) * 180 / Math.PI + 90
                  }deg)`,
                }}
              >
                <div 
                  className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[20px] border-l-transparent border-r-transparent border-b-yellow-400 drop-shadow-lg animate-bounce" 
                  style={{ marginTop: '-120px' }} 
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom section - Input */}
        <div className="flex-none p-6">
          <div className="max-w-md mx-auto">
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-4 border border-slate-600/50 shadow-xl">
              <WordInput
                onSubmit={onWordSubmit}
                disabled={!isCurrentUser || isSubmitting}
                currentSyllable={game.current_syllable || ''}
                isSubmitting={isSubmitting}
                onWordChange={onWordChange}
              />
            </div>
          </div>
        </div>

        {/* Dead players */}
        {deadPlayers.length > 0 && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-30">
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-slate-600/50">
              <div className="text-xs text-slate-400 mb-1">Eliminated</div>
              <div className="flex gap-2">
                {deadPlayers.map((player) => (
                  <div key={player.id} className="text-xs text-slate-500 line-through">
                    {player.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
