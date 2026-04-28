import { useState } from 'react';
import { Check, Copy, Play, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tables } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Player = Tables<'players'>;
type Room = Tables<'rooms'>;
type RoomWithCode = Room & { code?: string | null; short_code?: string | null };

interface GameWaitingProps {
  isSinglePlayer: boolean;
  players: Player[];
  currentUserId?: string;
  roomLocator?: string;
  room: Room;
  onStartGame: () => Promise<boolean>;
  isLoading?: boolean;
}

export const GameWaiting = ({
  isSinglePlayer,
  players,
  currentUserId,
  roomLocator,
  room,
  onStartGame,
  isLoading = false
}: GameWaitingProps) => {
  const [isStarting, setIsStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isHost = room?.creator_id === currentUserId;
  const isSolo = (players?.length ?? 0) <= 1;
  const canStart = isSolo || isHost;
  const roomWithCode = room as RoomWithCode;
  const roomCode = roomLocator || roomWithCode.code || roomWithCode.short_code || room.id?.slice(0, 4)?.toUpperCase();

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
      toast({ title: 'Link kopieret' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Kunne ikke kopiere', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="mx-auto h-8 w-48 bg-white/5" />
        <Skeleton className="h-32 w-full bg-white/5" />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 px-4">
      <div className="text-center">
        <div className="text-xs uppercase tracking-[0.25em] text-slate-500">{isSinglePlayer ? 'Solo' : 'Lobby'}</div>
        <h2 className="mt-2 text-2xl font-black text-white">{isSinglePlayer ? 'Klar til træning' : 'Rum klar'}</h2>
      </div>

      <div className="w-full rounded-lg border border-white/10 bg-white/[0.05] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500">Rumkode</div>
            <div className="font-mono text-3xl font-black tracking-[0.3em] text-orange-200">{roomCode}</div>
          </div>
          <Button onClick={handleCopy} variant="outline" size="icon" className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10">
            {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Users className="h-3.5 w-3.5" />
          {players.length} {players.length === 1 ? 'spiller' : 'spillere'}
        </div>

        <div className="mt-3 grid gap-2">
          {players.map((player) => {
            const isMe = player.user_id === currentUserId;
            return (
              <div key={player.id} className={cn(
                'flex items-center justify-between rounded-md border px-3 py-2 text-sm',
                isMe ? 'border-orange-400/20 bg-orange-400/10 text-orange-100' : 'border-white/5 bg-white/[0.03] text-slate-300'
              )}>
                <span className="truncate font-medium">{player.name}</span>
                <span className="text-xs text-slate-500">{isMe ? 'dig' : 'klar'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {canStart ? (
        <Button
          onClick={handleStart}
          disabled={isStarting}
          size="lg"
          className="h-12 w-full gap-2 bg-orange-500 font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-400"
        >
          <Play className="h-4 w-4" />
          {isStarting ? 'Starter...' : isSolo ? 'Start træning' : 'Start spil'}
        </Button>
      ) : (
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400">
          Venter på værten
        </div>
      )}
    </div>
  );
};
