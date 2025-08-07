
import React from 'react';
import { Button } from '@/components/ui/button';
import { PlayerList } from './PlayerList';
import { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useGameActions } from '@/hooks/useGameActions';

type Player = Tables<'players'>;
type Game = Tables<'games'>;

interface GameFinishedProps {
  isSinglePlayer: boolean;
  alivePlayers: Player[];
  players: Player[];
  game: Game;
  currentUserId?: string;
  onBackHome: () => void;
  roomId: string;
}

export const GameFinished = ({
  isSinglePlayer,
  alivePlayers,
  players,
  game,
  currentUserId,
  onBackHome,
  roomId
}: GameFinishedProps) => {
  const { trackGameCompletion } = useGameActions(roomId);
  
  // Track game completion when component mounts
  React.useEffect(() => {
    if (!currentUserId) return; // Only track for signed-in users
    
    const currentPlayer = players.find(p => p.user_id === currentUserId);
    if (!currentPlayer) return;
    
    // Calculate if the user won
    const userWon = isSinglePlayer ? 
      currentPlayer.is_alive : // In single player, winning means being alive
      alivePlayers.length === 1 && alivePlayers[0].user_id === currentUserId; // In multiplayer, winning means being the last one standing
    
    // Calculate playtime (rough estimate based on game creation to now)
    const gameStartTime = new Date(game.created_at).getTime();
    const gameEndTime = Date.now();
    const playtimeSeconds = Math.floor((gameEndTime - gameStartTime) / 1000);
    
    trackGameCompletion(userWon, Math.max(1, playtimeSeconds)); // Minimum 1 second
  }, [currentUserId, players, alivePlayers, isSinglePlayer, game.created_at, trackGameCompletion]);
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

  return (
    <div className="text-center space-y-8 animate-fade-in">
      <div className="space-y-4">
        <div className="text-6xl animate-bounce">
          {isSinglePlayer ? "🎯" : alivePlayers.length === 1 ? "🏆" : "🎮"}
        </div>
        
        <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          {isSinglePlayer ? "Træning afsluttet!" : "Spillet er slut!"}
        </h2>
        
        {alivePlayers.length === 1 && !isSinglePlayer && (
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl p-6 shadow-lg border border-yellow-300">
            <p className="text-2xl font-bold text-orange-800">
              🎉 {alivePlayers[0].name} vandt! 🎉
            </p>
          </div>
        )}
        
        {isSinglePlayer && (
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl p-6 shadow-lg border border-blue-300">
            <p className="text-xl font-bold text-purple-800">
              Du brugte {game.used_words?.length || 0} ord i din træning!
            </p>
          </div>
        )}
        
        {/* Game Summary */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 shadow-lg border border-green-200">
          <h3 className="text-2xl font-bold text-green-800 mb-4 text-center">📊 Spil oversigt</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Correct Words */}
            <div className="bg-white/70 rounded-lg p-4">
              <h4 className="text-lg font-bold text-green-700 mb-3 flex items-center">
                ✅ Korrekte ord ({game.correct_words?.length || game.used_words?.length || 0})
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {(game.correct_words?.length ? game.correct_words : game.used_words || []).map((word, index) => (
                  <span 
                    key={index} 
                    className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm font-medium mr-2 mb-1"
                  >
                    {word}
                  </span>
                ))}
                {(!game.correct_words?.length && !game.used_words?.length) && (
                  <p className="text-gray-500 italic">Ingen ord blev accepteret</p>
                )}
              </div>
            </div>
            
            {/* Incorrect Words */}
            <div className="bg-white/70 rounded-lg p-4">
              <h4 className="text-lg font-bold text-red-700 mb-3 flex items-center">
                ❌ Forkerte ord ({game.incorrect_words?.length || 0})
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {game.incorrect_words?.map((word, index) => (
                  <span 
                    key={index} 
                    className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded-md text-sm font-medium mr-2 mb-1"
                  >
                    {word}
                  </span>
                ))}
                {(!game.incorrect_words?.length) && (
                  <p className="text-gray-500 italic">Ingen forkerte ord blev forsøgt</p>
                )}
              </div>
            </div>
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
