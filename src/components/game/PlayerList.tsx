
import { Badge } from '@/components/ui/badge';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type Player = Tables<'players'>;

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string;
  currentUserId?: string;
}

export const PlayerList = ({ players, currentPlayerId, currentUserId }: PlayerListProps) => {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-200">
      <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center">
        <span className="text-2xl mr-2">👥</span>
        Spillere ({players.length})
      </h3>
      <div className="space-y-3">
        {players.map((player) => (
          <div
            key={player.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg transition-all duration-300 border",
              player.id === currentPlayerId 
                ? "bg-gradient-to-r from-green-100 to-emerald-100 border-green-300 shadow-md" 
                : "bg-gray-50 border-gray-200 hover:bg-gray-100",
              !player.is_alive && "opacity-50"
            )}
          >
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-3 h-3 rounded-full transition-colors duration-300",
                player.id === currentPlayerId ? "bg-green-500" : "bg-gray-400"
              )}></div>
              <span className={cn(
                "font-medium transition-colors duration-300",
                player.user_id === currentUserId ? "text-purple-700" : "text-gray-700",
                player.id === currentPlayerId && "text-green-700"
              )}>
                {player.name}
                {player.user_id === currentUserId && " (dig)"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                {Array.from({ length: 3 }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors duration-300",
                      i < player.lives ? "bg-red-500" : "bg-gray-300"
                    )}
                  ></div>
                ))}
              </div>
              {!player.is_alive && (
                <Badge variant="destructive" className="text-xs">
                  Elimineret
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
