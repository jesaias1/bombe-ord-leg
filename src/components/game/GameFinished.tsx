
import { Button } from '@/components/ui/button';
import { PlayerList } from './PlayerList';
import { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

type Player = Tables<'players'>;
type Game = Tables<'games'>;

interface GameFinishedProps {
  isSinglePlayer: boolean;
  alivePlayers: Player[];
  players: Player[];
  game: Game;
  currentUserId?: string;
  onBackHome: () => void;
}

export const GameFinished = ({
  isSinglePlayer,
  alivePlayers,
  players,
  game,
  currentUserId,
  onBackHome
}: GameFinishedProps) => {
  const [showFireworks, setShowFireworks] = useState(false);

  // Show fireworks animation when component mounts and there's a winner
  useEffect(() => {
    if (!isSinglePlayer && alivePlayers.length === 1) {
      setShowFireworks(true);
      // Hide fireworks after 3 seconds
      setTimeout(() => setShowFireworks(false), 3000);
    }
  }, [isSinglePlayer, alivePlayers.length]);

  const handleRestartGame = async () => {
    if (!game.room_id) return;

    try {
      // Reset all players to alive with 3 lives
      await supabase
        .from('players')
        .update({
          lives: 3,
          is_alive: true
        })
        .eq('room_id', game.room_id);

      // Create a new game for this room
      const { error } = await supabase
        .from('games')
        .insert({
          room_id: game.room_id,
          status: 'playing',
          current_player_id: players[0]?.id,
          current_syllable: 'ka', // Will be overridden by first syllable selection
          timer_duration: 15,
          timer_end_time: new Date(Date.now() + 15000).toISOString(),
          used_words: [],
          round_number: 1
        });
      
      if (error) {
        console.error('Error restarting game:', error);
      }
    } catch (error) {
      console.error('Error restarting game:', error);
    }
  };

  const totalWordsGuessed = game.used_words?.length || 0;
  const totalRounds = game.round_number || 1;

  return (
    <div className="text-center space-y-8 animate-fade-in relative">
      {/* Fireworks animation */}
      {showFireworks && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {/* Multiple fireworks */}
          <div className="absolute top-1/4 left-1/4 text-6xl animate-bounce">🎆</div>
          <div className="absolute top-1/3 right-1/4 text-5xl animate-pulse">🎇</div>
          <div className="absolute top-1/2 left-1/3 text-7xl animate-spin">✨</div>
          <div className="absolute top-1/4 right-1/3 text-6xl animate-bounce">🎆</div>
          <div className="absolute top-2/3 left-1/2 text-5xl animate-pulse">🎇</div>
          <div className="absolute top-1/3 left-1/2 text-4xl animate-bounce">⭐</div>
          <div className="absolute top-1/2 right-1/4 text-6xl animate-spin">🎆</div>
          <div className="absolute top-3/4 left-1/4 text-5xl animate-pulse">✨</div>
        </div>
      )}

      <div className="space-y-4">
        <div className="text-6xl animate-bounce">
          {isSinglePlayer ? "🎯" : alivePlayers.length === 1 ? "🏆" : "🎮"}
        </div>
        
        <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          {isSinglePlayer ? "Træning afsluttet!" : "Spillet er slut!"}
        </h2>
        
        {alivePlayers.length === 1 && !isSinglePlayer && (
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl p-6 shadow-lg border border-yellow-300 relative">
            <p className="text-3xl font-bold text-orange-800 mb-2">
              🎉 Tillykke! 🎉
            </p>
            <p className="text-2xl font-bold text-orange-700">
              {alivePlayers[0].name} vandt spillet!
            </p>
            <p className="text-lg text-orange-600 mt-2">
              Fantastisk spillet! 🌟
            </p>
          </div>
        )}
        
        {/* Enhanced completion stats */}
        <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl p-6 shadow-lg border border-blue-300">
          <div className="space-y-3">
            <p className="text-xl font-bold text-purple-800">
              📊 Spil Statistik
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="bg-white/60 rounded-lg p-4">
                <p className="text-lg font-semibold text-blue-700">
                  {totalWordsGuessed} ord gættet
                </p>
                <p className="text-sm text-gray-600">I alt</p>
              </div>
              <div className="bg-white/60 rounded-lg p-4">
                <p className="text-lg font-semibold text-green-700">
                  {totalRounds - 1} runder
                </p>
                <p className="text-sm text-gray-600">Gennemført</p>
              </div>
            </div>
            {isSinglePlayer && (
              <p className="text-sm text-purple-600 mt-2">
                Godt klaret i træning mode! 🎯
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 shadow-lg border border-gray-200">
        <PlayerList players={players} currentUserId={currentUserId} />
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Button 
          onClick={handleRestartGame}
          size="lg"
          className="text-lg px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-xl transform hover:scale-105 transition-all duration-300"
        >
          🔄 Spil igen
        </Button>
        
        <Button 
          onClick={onBackHome}
          size="lg"
          variant="outline"
          className="text-lg px-8 py-4 border-2 border-gray-300 hover:border-gray-400 font-bold transform hover:scale-105 transition-all duration-300"
        >
          🏠 Tilbage til forsiden
        </Button>
      </div>
    </div>
  );
};
