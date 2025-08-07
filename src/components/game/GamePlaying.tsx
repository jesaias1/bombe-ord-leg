
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
  
  console.log('GamePlaying render - alivePlayers:', alivePlayers, 'currentPlayerPosition:', 'new layout');

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
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)`
        }} />
      </div>

      {/* Central Game Area */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="relative">
          {/* Main syllable circle */}
          <div className="w-48 h-48 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border-4 border-slate-600 shadow-2xl flex items-center justify-center relative overflow-hidden">
            {/* Inner glow effect */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20" />
            
            <div className="relative z-10 text-center">
              <div className="text-5xl font-black text-white mb-2 drop-shadow-lg">
                {game.current_syllable?.toUpperCase()}
              </div>
              <div className="text-sm text-slate-300 font-medium">
                Find a word containing this syllable
              </div>
            </div>
          </div>

          {/* Arrow pointing to current player */}
          {currentPlayerPos && alivePlayers.length > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              <div 
                className="absolute w-20 h-20 flex items-center justify-center transition-all duration-700 ease-out"
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
                <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[20px] border-l-transparent border-r-transparent border-b-yellow-400 drop-shadow-lg animate-bounce" 
                     style={{ marginTop: '-80px' }} />
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Players positioned around the center */}
      {alivePlayers.map((player, index) => renderPlayer(player, index))}
      
      {/* Dead players at the bottom */}
      {deadPlayers.length > 0 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-2 z-30">
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-600">
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

      {/* Word Input at bottom */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 z-30">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-4 border border-slate-600 shadow-2xl">
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
  );
};
