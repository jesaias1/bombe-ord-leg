
interface GameHeaderProps {
  roomName: string;
  roomId: string;
  difficulty: string;
  isSinglePlayer: boolean;
}

export const GameHeader = ({ roomName, roomId, difficulty, isSinglePlayer }: GameHeaderProps) => {
  return (
    <div className="text-center mb-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">{roomName}</h1>
      <p className="text-gray-600">
        Vanskelighed: {difficulty} | Rum: {roomId}
        {isSinglePlayer && <span className="ml-2 text-blue-600">• Solo træning</span>}
      </p>
    </div>
  );
};
