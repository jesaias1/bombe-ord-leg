
import { Button } from '@/components/ui/button';
import { PlayerList } from './PlayerList';
import { Tables } from '@/integrations/supabase/types';

type Player = Tables<'players'>;
type Game = Tables<'games'>;

interface GameFinishedProps {
  isSinglePlayer: boolean;
  alivePlayers: Player[];
  players: Player[];
  game: Game;
  currentUserId?: string;
  onBackHome: () => void;
}

export const GameFinished = ({
  isSinglePlayer,
  alivePlayers,
  players,
  game,
  currentUserId,
  onBackHome
}: GameFinishedProps) => {
  return (
    <div className="text-center space-y-6">
      <h2 className="text-3xl font-bold">
        {isSinglePlayer ? "Træning afsluttet!" : "Spillet er slut!"}
      </h2>
      {alivePlayers.length === 1 && !isSinglePlayer && (
        <p className="text-xl">🎉 {alivePlayers[0].name} vandt! 🎉</p>
      )}
      {isSinglePlayer && (
        <p className="text-xl">Du brugte {game.used_words?.length || 0} ord i din træning!</p>
      )}
      <PlayerList players={players} currentUserId={currentUserId} />
      <Button onClick={onBackHome} className="mt-4">
        Tilbage til forsiden
      </Button>
    </div>
  );
};
