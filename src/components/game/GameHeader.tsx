
interface GameHeaderProps {
  roomName: string;
  roomId: string;
  difficulty: string;
  isSinglePlayer: boolean;
}

export const GameHeader = ({ roomName, roomId, difficulty, isSinglePlayer }: GameHeaderProps) => {
  return (
    <div className="text-center py-3">
      <h1 className="text-xl sm:text-2xl font-bold text-white/90 mb-1">{roomName}</h1>
      <p className="text-slate-500 text-xs sm:text-sm">
        Vanskelighed: {difficulty} | Rum: {roomId}
        {isSinglePlayer && <span className="ml-2 text-orange-400">• Solo træning</span>}
      </p>
    </div>
  );
};
