
import { Button } from '@/components/ui/button';
import { PlayerList } from './PlayerList';
import { Skeleton } from '@/components/ui/skeleton';
import { Tables } from '@/integrations/supabase/types';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { Copy, Check } from 'lucide-react';

type Player = Tables<'players'>;
type Room = Tables<'rooms'>;

interface GameWaitingProps {
  isSinglePlayer: boolean;
  players: Player[];
  currentUserId?: string;
  room: Room;
  onStartGame: () => Promise<boolean>;
  isLoading?: boolean;
}

export const GameWaiting = ({
  isSinglePlayer,
  players,
  currentUserId,
  room,
  onStartGame,
  isLoading = false
}: GameWaitingProps) => {
  const [isStarting, setIsStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isHost = room?.creator_id === currentUserId;
  const isSolo = (players?.length ?? 0) <= 1;

  const handleStart = async () => {
    if (isStarting) return;
    setIsStarting(true);
    const ok = await onStartGame();
    if (!ok) setIsStarting(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast({ title: "Link kopieret! 🎉" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Kunne ikke kopiere", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 w-full max-w-sm">
        <Skeleton className="h-8 w-48 mx-auto bg-white/5" />
        <Skeleton className="h-12 w-full bg-white/5" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm px-4">
      <div className="text-4xl">{isSinglePlayer ? "🎯" : "⏳"}</div>

      <h2 className="text-lg font-bold text-white text-center">
        {isSinglePlayer ? "Klar til solo træning!" : "Venter på spillere..."}
      </h2>

      {/* Player list - compact */}
      <div className="w-full ob-glass rounded-lg p-3">
        <div className="text-xs text-slate-500 mb-2">Spillere ({players.length})</div>
        <div className="space-y-1.5">
          {players.map(p => (
            <div key={p.id} className="flex items-center gap-2 text-sm text-slate-300">
              <div className="w-5 h-5 rounded bg-orange-500/60 text-white text-[10px] flex items-center justify-center font-bold">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{p.name}</span>
              {p.user_id === currentUserId && <span className="text-orange-400 text-xs">★</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Copy link */}
      {!isSolo && (
        <Button onClick={handleCopy} variant="outline" size="sm"
          className="gap-1.5 text-xs bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white">
          {copied ? <><Check className="w-3 h-3 text-green-400" /> Kopieret!</> : <><Copy className="w-3 h-3" /> Kopier link</>}
        </Button>
      )}

      {/* Start button */}
      {(isSolo || isHost) && (
        <Button
          onClick={handleStart}
          disabled={isStarting}
          size="lg"
          className="w-full text-base bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold shadow-lg shadow-orange-500/20"
        >
          {isStarting ? "Starter..." : isSolo ? "🚀 Start træning" : "🎮 Start spil"}
        </Button>
      )}

      {!isSolo && !isHost && (
        <div className="text-slate-500 text-sm">
          Venter på at værten starter...
        </div>
      )}
    </div>
  );
};
