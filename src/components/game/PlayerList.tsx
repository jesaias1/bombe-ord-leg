
import { Badge } from '@/components/ui/badge';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { Heart } from 'lucide-react';

type Player = Tables<'players'>;

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string;
  currentUserId?: string;
}

export const PlayerList = ({ players, currentPlayerId, currentUserId }: PlayerListProps) => {
  return (
    <div className="ob-glass-card p-5">
      <h3 className="font-bold text-base mb-3 text-white/80 flex items-center gap-2">
        <span className="text-lg">👥</span>
        Spillere ({players.length})
      </h3>
      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.id}
            className={cn(
              "flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-300 border",
              player.id === currentPlayerId 
                ? "bg-orange-500/10 border-orange-500/20 shadow-sm shadow-orange-500/5" 
                : "bg-white/3 border-white/5 hover:bg-white/5",
              !player.is_alive && "opacity-40"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-2.5 h-2.5 rounded-full transition-colors",
                player.id === currentPlayerId ? "bg-orange-400" : "bg-slate-600"
              )} />
              <span className={cn(
                "font-medium text-sm",
                player.user_id === currentUserId ? "text-orange-300" : "text-slate-300",
                player.id === currentPlayerId && "text-orange-300"
              )}>
                {player.name}
                {player.user_id === currentUserId && " (dig)"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: Math.max(3, player.lives) }, (_, i) => (
                  <Heart
                    key={i}
                    className={cn(
                      "w-3 h-3 transition-colors",
                      i < player.lives ? "text-red-400 fill-red-400" : "text-slate-700"
                    )}
                  />
                ))}
              </div>
              {!player.is_alive && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 border-red-500/20">
                  Ude
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
