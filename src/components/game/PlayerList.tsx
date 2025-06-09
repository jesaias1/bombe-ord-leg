
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
              "flex items-center justify-between p-3 rounded-lg transition-all duration-300",
              currentPlayerId === player.id && [
                "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg",
                "ring-4 ring-blue-300 ring-opacity-50",
                "transform scale-105"
              ],
              currentPlayerId !== player.id && !player.is_alive && "opacity-50 bg-gray-100",
              currentPlayerId !== player.id && player.is_alive && "bg-gray-50 hover:bg-gray-100",
              player.user_id === currentUserId && currentPlayerId !== player.id && "ring-2 ring-green-300"
            )}
          >
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-4 h-4 rounded-full transition-all duration-300",
                currentPlayerId === player.id && "w-5 h-5 bg-yellow-400 shadow-lg",
                currentPlayerId !== player.id && player.is_alive && "bg-green-500",
                !player.is_alive && "bg-red-500"
              )} />
              <span className={cn(
                "font-medium transition-all duration-300",
                currentPlayerId === player.id && "font-bold text-white text-lg drop-shadow-sm",
                currentPlayerId !== player.id && player.is_alive && "text-gray-700",
                !player.is_alive && "line-through text-gray-500"
              )}>
                {player.name}
                {player.user_id === currentUserId && " (dig)"}
                {currentPlayerId === player.id && " - DIN TUR! 🎯"}
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-4 h-4 rounded-full border-2 transition-all duration-300",
                    currentPlayerId === player.id && "w-5 h-5 shadow-md",
                    i < player.lives ? "bg-red-500 border-red-600" : "bg-gray-200 border-gray-300",
                    currentPlayerId === player.id && i < player.lives && "bg-red-400 border-red-500"
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
