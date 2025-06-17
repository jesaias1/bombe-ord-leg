
import { Button } from '@/components/ui/button';
import { PlayerList } from './PlayerList';
import { Skeleton } from '@/components/ui/skeleton';
import { Tables } from '@/integrations/supabase/types';

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
    <div className="text-center space-y-8 animate-fade-in">
      <div className="relative">
        {/* Decorative floating elements with better spacing */}
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-6">
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce shadow-lg"></div>
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce animation-delay-500 shadow-lg"></div>
            <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce animation-delay-1000 shadow-lg"></div>
          </div>
        </div>
        
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
      
      {canStartGame && (
        <div className="space-y-4 pt-4">
          <Button 
            onClick={onStartGame} 
            size="lg" 
            className="text-xl px-12 py-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-xl transform hover:scale-105 transition-all duration-300"
            style={{
              animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          >
            {isSinglePlayer ? "🚀 Start træning" : "🎮 Start Spil"}
          </Button>
          <p className="text-sm text-gray-600 animate-fade-in mt-3">
            Klik for at begynde din {isSinglePlayer ? "træning" : "multiplayer oplevelse"}!
          </p>
        </div>
      )}
      
      {!isSinglePlayer && !canStartGame && players.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 animate-fade-in mt-6">
          <p className="text-yellow-800 font-medium">
            Venter på flere spillere eller at værtsejeren starter spillet...
          </p>
        </div>
      )}
    </div>
  );
};
