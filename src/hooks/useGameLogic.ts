
import { Tables } from '@/integrations/supabase/types';
import { useGameActions } from '@/hooks/useGameActions';
import { useTimerHandler } from '@/hooks/useTimerHandler';

type Game = Tables<'games'>;
type Player = Tables<'players'>;
type Room = Tables<'rooms'>;

export const useGameLogic = (
  game: Game | null, 
  players: Player[] = [], 
  currentUserId?: string, 
  room?: Room | null
) => {
  const gameActions = useGameActions(game, players, room);
  const timerHandler = useTimerHandler(game, players, room);

  // Get current player
  const currentPlayer = game?.current_player_id 
    ? players.find(p => p.id === game.current_player_id)
    : null;

  // Check if it's current user's turn
  const isMyTurn = currentPlayer?.user_id === currentUserId;

  // Get alive players
  const alivePlayers = players.filter(player => player.is_alive);

  // Check if game can start
  const canStartGame = players.length >= 1 && 
    (players.some(p => p.user_id === currentUserId) || !currentUserId);

  return {
    ...gameActions,
    ...timerHandler,
    currentPlayer,
    isMyTurn,
    alivePlayers,
    canStartGame
  };
};
