
import { Button } from '@/components/ui/button';
import { PlayerList } from './PlayerList';
import { Skeleton } from '@/components/ui/skeleton';
import { Tables } from '@/integrations/supabase/types';
import { ReadyToggle } from './ReadyToggle';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Player = Tables<'players'>;
type Room = Tables<'rooms'>;

interface GameWaitingProps {
  isSinglePlayer: boolean;
  players: Player[];
  currentUserId?: string;
  canStartGame: boolean;
  isRoomCreator: boolean;
  room: Room;
  onStartGame: () => Promise<boolean>;
  isLoading?: boolean;
}

export const GameWaiting = ({ 
  isSinglePlayer, 
  players, 
  currentUserId, 
  canStartGame, 
  isRoomCreator,
  room,
  onStartGame,
  isLoading = false
}: GameWaitingProps) => {
  const [isRocketFlying, setIsRocketFlying] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  
  const playerCount = players?.length ?? 0;
  const isSolo = playerCount <= 1;
  const isHost = room?.creator_id === currentUserId;
  const currentPlayer = players.find(p => p.user_id === currentUserId);
  const allNonHostReady = players
    ?.filter((p: any) => p.user_id !== room?.creator_id)
    .every((p: any) => p.ready);
  const canStartMultiplayer = !isSolo && isHost && playerCount >= 2 && allNonHostReady;

  const handleStartClick = async () => {
    // Prevent double clicks
    if (isRocketFlying) return;
    setIsRocketFlying(true);

    // Start immediately, then play animations
    const ok = await onStartGame();
    if (!ok) {
      // Re-enable button if start failed
      setIsRocketFlying(false);
      setShowExplosion(false);
      return;
    }

    // Ready states are now reset inside startNewGame hook

    // Success animations
    setTimeout(() => setShowExplosion(true), 900);
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
        <PlayerList players={players} currentUserId={currentUserId} showReady={!isSolo} />
        
        {/* Ready Toggle for non-host players in multiplayer */}
        {!isSolo && currentPlayer && !isHost && (
          <div className="mt-4 text-center">
            <ReadyToggle 
              roomId={room.id} 
              userId={currentPlayer.user_id} 
              ready={currentPlayer.ready || false} 
            />
          </div>
        )}
        
        {/* Ready Status Summary for Host */}
        {!isSolo && isHost && (
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-600">
              {allNonHostReady ? (
                <span className="text-green-700 font-medium">✅ Alle spillere er klar!</span>
              ) : (
                <span className="text-yellow-700 font-medium">
                  ⏳ Venter på at {players.filter(p => p.user_id !== room?.creator_id && !p.ready).length} spiller(e) bliver klar
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Start button logic: solo always enabled, multiplayer requires ready checks */}
      {isSolo ? (
        // SOLO: always show Start træning; no ready UI
        <div className="space-y-4 pt-4">
          <Button 
            onClick={handleStartClick} 
            size="lg" 
            className="text-xl px-12 py-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-xl transform hover:scale-105 transition-all duration-300"
            disabled={isRocketFlying}
          >
            🚀 Start træning
          </Button>
          <p className="text-sm text-gray-600 animate-fade-in mt-3">
            Klik for at begynde din træning!
          </p>
        </div>
      ) : isHost ? (
        // MULTI host: Start spil (disabled until all others ready)
        <div className="space-y-4 pt-4">
          <Button 
            onClick={handleStartClick} 
            size="lg" 
            className="text-xl px-12 py-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-xl transform hover:scale-105 transition-all duration-300"
            disabled={!canStartMultiplayer || isRocketFlying}
          >
            🎮 Start spil
          </Button>
          <p className="text-sm text-gray-600 animate-fade-in mt-3">
            Klik for at begynde multiplayer oplevelsen!
          </p>
        </div>
      ) : (
        // MULTI non-host: Show waiting message
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-fade-in mt-6">
          <p className="text-blue-800 font-medium">
            👑 Venter på at værten starter spillet...
          </p>
        </div>
      )}
      
      {/* Show ready requirements for host if not all ready */}
      {!isSolo && isHost && !allNonHostReady && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 animate-fade-in mt-6">
          <p className="text-yellow-800 font-medium">
            ⚠️ Alle spillere skal være klar før spillet kan startes
          </p>
        </div>
      )}
    </div>
  );
};
