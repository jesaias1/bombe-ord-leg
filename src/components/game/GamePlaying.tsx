
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
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: '#1e293b',
      color: 'white',
      padding: '20px',
      zIndex: 10
    }}>
      {/* Simple test content */}
      <div style={{ 
        position: 'absolute',
        top: '20px',
        left: '20px',
        backgroundColor: 'red',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        zIndex: 50
      }}>
        GAME IS WORKING! Players: {alivePlayers.length}
      </div>

      {/* Central syllable - simple version */}
      <div style={{ 
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '60px',
        fontWeight: 'bold',
        backgroundColor: '#374151',
        padding: '40px',
        borderRadius: '50%',
        border: '4px solid #6b7280',
        textAlign: 'center',
        width: '200px',
        height: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {game.current_syllable?.toUpperCase()}
      </div>

      {/* Simple player display */}
      {alivePlayers.map((player, index) => {
        const isCurrentPlayer = player.id === game.current_player_id;
        return (
          <div
            key={player.id}
            style={{
              position: 'absolute',
              top: '20%',
              left: `${20 + index * 200}px`,
              backgroundColor: isCurrentPlayer ? '#fbbf24' : '#6b7280',
              color: isCurrentPlayer ? '#000' : '#fff',
              padding: '20px',
              borderRadius: '10px',
              fontWeight: 'bold',
              zIndex: 20
            }}
          >
            <div>{player.name}</div>
            <div>❤️ {player.lives}</div>
            {isCurrentPlayer && <div>👑 YOUR TURN</div>}
          </div>
        );
      })}

      {/* Simple word input */}
      <div style={{ 
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#374151',
        padding: '20px',
        borderRadius: '10px',
        width: '400px'
      }}>
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
