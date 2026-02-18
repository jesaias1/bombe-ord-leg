
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tables } from '@/integrations/supabase/types';
import { useGameActions } from '@/hooks/useGameActions';

type Player = Tables<'players'>;
type Game = Tables<'games'>;
type Room = Tables<'rooms'>;

interface GameFinishedProps {
  isSinglePlayer: boolean;
  alivePlayers: Player[];
  players: Player[];
  game: Game;
  currentUserId?: string;
  onBackHome: () => void;
  room: Room;
  roomLocator?: string;
}

export const GameFinished = ({
  isSinglePlayer,
  alivePlayers,
  players,
  game,
  currentUserId,
  onBackHome,
  room,
  roomLocator
}: GameFinishedProps) => {
  const { trackGameCompletion, startNewGame } = useGameActions(room, roomLocator, players, game);

  React.useEffect(() => {
    if (!currentUserId) return;
    const me = players.find(p => p.user_id === currentUserId);
    if (!me) return;
    const won = isSinglePlayer ? me.is_alive : game.winner_player_id === me.id;
    const secs = Math.max(1, Math.floor((Date.now() - new Date(game.created_at).getTime()) / 1000));
    trackGameCompletion(won, secs);
  }, [currentUserId]);

  const winner = players.find(p => p.id === game.winner_player_id);
  const me = players.find(p => p.user_id === currentUserId);
  const iDidWin = me?.id === game.winner_player_id;
  const words = game.correct_words?.length || game.used_words?.length || 0;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm px-4 overflow-y-auto max-h-full">
      <div className="text-5xl">{iDidWin || (isSinglePlayer && me?.is_alive) ? "🏆" : "💥"}</div>

      <h2 className="text-xl font-bold text-white">
        {isSinglePlayer ? "Træning slut!" : iDidWin ? "Du vandt! 🎉" : winner ? `${winner.name} vandt!` : "Spillet er slut!"}
      </h2>

      {/* Stats */}
      <div className="ob-glass rounded-lg p-4 w-full text-center">
        <div className="text-2xl font-bold text-orange-400">{words}</div>
        <div className="text-xs text-slate-500">ord brugt</div>
      </div>

      {/* Word lists */}
      <div className="grid grid-cols-2 gap-2 w-full text-xs">
        <div className="ob-glass rounded-lg p-2.5">
          <div className="text-green-400 font-semibold mb-1">✅ Korrekte</div>
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
            {(game.correct_words || game.used_words || []).map((w, i) => (
              <span key={i} className="bg-green-500/10 text-green-300 px-1.5 py-0.5 rounded text-[10px]">{w}</span>
            ))}
            {!(game.correct_words?.length || game.used_words?.length) && <span className="text-slate-600 italic">Ingen</span>}
          </div>
        </div>
        <div className="ob-glass rounded-lg p-2.5">
          <div className="text-red-400 font-semibold mb-1">❌ Forkerte</div>
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
            {(game.incorrect_words || []).map((w, i) => (
              <span key={i} className="bg-red-500/10 text-red-300 px-1.5 py-0.5 rounded text-[10px]">{w}</span>
            ))}
            {!game.incorrect_words?.length && <span className="text-slate-600 italic">Ingen</span>}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 w-full">
        <Button onClick={() => startNewGame()} size="sm"
          className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold">
          🔄 Igen
        </Button>
        <Button onClick={onBackHome} size="sm" variant="outline"
          className="flex-1 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10">
          🏠 Hjem
        </Button>
      </div>
    </div>
  );
};
