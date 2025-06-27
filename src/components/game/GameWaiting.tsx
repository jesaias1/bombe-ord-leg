
import { Button } from '@/components/ui/button';
import { PlayerList } from './PlayerList';
import { Skeleton } from '@/components/ui/skeleton';
import { Tables } from '@/integrations/supabase/types';
import { useState } from 'react';

type Player = Tables<'players'>;

interface GameWaitingProps {
  isSinglePlayer: boolean;
  players: Player[];
  currentUserId?: string;
  canStartGame: boolean;
  onStartGame: () => void;
  isLoading?: boolean;
}

export const GameWaiting = ({ 
  isSinglePlayer, 
  players, 
  currentUserId, 
  canStartGame, 
  onStartGame,
  isLoading = false
}: GameWaitingProps) => {
  const [isRocketFlying, setIsRocketFlying] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);

  const handleStartClick = () => {
    setIsRocketFlying(true);
    // Show explosion at 90% of animation (0.9s out of 1s)
    setTimeout(() => {
      setShowExplosion(true);
    }, 900);
    // Wait for full animation to complete before starting the game
    setTimeout(() => {
      onStartGame();
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="text-center space-y-6 animate-fade-in">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64 mx-auto" />
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-12 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-8 animate-fade-in relative">
      {/* Flying rocket animation */}
      {isRocketFlying && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-6xl animate-[rocket-fly_3s_ease-in-out_forwards]">
            🚀
          </div>
        </div>
      )}

      {/* Explosion animation */}
      {showExplosion && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-8xl animate-[explosion_0.5s_ease-out_forwards]">
            💥
          </div>
        </div>
      )}

      <div className="relative">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          {isSinglePlayer ? "🎯 Klar til solo træning!" : "⏳ Venter på at spillet starter..."}
        </h2>
        
        {/* Show difficulty with better spacing */}
        <div className="mt-6 mb-8">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg px-6 py-3 inline-block border border-indigo-200">
            <p className="text-indigo-700 font-medium">
              Sværhedsgrad: <span className="font-bold text-indigo-800">Mellem</span>
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 shadow-lg border border-blue-200 transform hover:scale-[1.02] transition-all duration-300">
        <PlayerList players={players} currentUserId={currentUserId} />
      </div>
      
      {/* Only room creator can start the game */}
      {canStartGame && (
        <div className="space-y-4 pt-4">
          <Button 
            onClick={handleStartClick} 
            size="lg" 
            className="text-xl px-12 py-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-xl transform hover:scale-105 transition-all duration-300"
            disabled={isRocketFlying}
          >
            {isSinglePlayer ? "🚀 Start træning" : "🎮 Start Spil"}
          </Button>
          <p className="text-sm text-gray-600 animate-fade-in mt-3">
            Kun rumskaberen kan starte spillet! 👑
          </p>
        </div>
      )}
      
      {!canStartGame && players.length >= 1 && (
        <div className="space-y-4 pt-4">
          <p className="text-lg text-gray-600 animate-fade-in">
            Venter på at rumskaberen starter spillet... ⏳
          </p>
        </div>
      )}
    </div>
  );
};
