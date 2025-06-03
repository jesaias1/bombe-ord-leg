
import { Button } from '@/components/ui/button';
import { PlayerList } from './PlayerList';
import { Tables } from '@/integrations/supabase/types';

type Player = Tables<'players'>;

interface GameWaitingProps {
  isSinglePlayer: boolean;
  players: Player[];
  currentUserId?: string;
  canStartGame: boolean;
  onStartGame: () => void;
}

export const GameWaiting = ({ 
  isSinglePlayer, 
  players, 
  currentUserId, 
  canStartGame, 
  onStartGame 
}: GameWaitingProps) => {
  return (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-semibold">
        {isSinglePlayer ? "Klar til solo træning!" : "Venter på at spillet starter..."}
      </h2>
      <PlayerList players={players} currentUserId={currentUserId} />
      {canStartGame && (
        <Button onClick={onStartGame} size="lg" className="text-lg px-8 py-3">
          {isSinglePlayer ? "Start træning" : "Start Spil"}
        </Button>
      )}
    </div>
  );
};
