
import { cn } from '@/lib/utils';

interface Player {
  id: string;
  name: string;
  lives: number;
  is_alive: boolean;
  user_id: string | null;
}

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string;
  currentUserId?: string;
}

export const PlayerList = ({ players, currentPlayerId, currentUserId }: PlayerListProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="font-bold text-lg mb-3 text-gray-800">Spillere</h3>
      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg transition-colors",
              currentPlayerId === player.id && "bg-blue-100 border-2 border-blue-300",
              !player.is_alive && "opacity-50 bg-gray-100",
              player.user_id === currentUserId && "ring-2 ring-green-300"
            )}
          >
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-3 h-3 rounded-full",
                player.is_alive ? "bg-green-500" : "bg-red-500"
              )} />
              <span className={cn(
                "font-medium",
                currentPlayerId === player.id && "font-bold text-blue-700",
                !player.is_alive && "line-through text-gray-500"
              )}>
                {player.name}
                {player.user_id === currentUserId && " (dig)"}
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-4 h-4 rounded-full border-2",
                    i < player.lives ? "bg-red-500 border-red-600" : "bg-gray-200 border-gray-300"
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
