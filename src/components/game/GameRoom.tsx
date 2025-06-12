
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GameHeader } from './GameHeader';
import { GameWaiting } from './GameWaiting';
import { GamePlaying } from './GamePlaying';
import { GameFinished } from './GameFinished';
import { QuickWordImport } from '../admin/QuickWordImport';
import { resetGameSyllables } from '@/utils/danishSyllables';
import { Tables } from '@/integrations/supabase/types';

type Room = Tables<'rooms'>;
type Game = Tables<'games'>;
type Player = Tables<'players'>;

export const GameRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();

  // Reset syllables when entering a new game room
  useEffect(() => {
    resetGameSyllables();
  }, [roomId]);

  const { data: room } = useQuery({
    queryKey: ['room', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      if (error) throw error;
      return data as Room;
    },
    enabled: !!roomId,
  });

  const { data: game } = useQuery({
    queryKey: ['game', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Game | null;
    },
    enabled: !!roomId,
    refetchInterval: 1000,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId)
        .order('joined_at');
      if (error) throw error;
      return data as Player[];
    },
    enabled: !!roomId,
    refetchInterval: 1000,
  });

  // Check word count and show import option if low
  const { data: wordCount = 0 } = useQuery({
    queryKey: ['word-count-check'],
    queryFn: async () => {
      const { count } = await supabase
        .from('danish_words')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  if (!room) {
    return <div className="text-center p-8">Indlæser værelse...</div>;
  }

  const renderGameContent = () => {
    if (!game || game.status === 'waiting') {
      return (
        <GameWaiting 
          isSinglePlayer={false}
          players={players}
          canStartGame={false}
          onStartGame={() => {}}
        />
      );
    }
    
    if (game.status === 'playing') {
      return (
        <GamePlaying 
          game={game}
          players={players}
          timeLeft={0}
          isCurrentUser={false}
          isSinglePlayer={false}
          onWordSubmit={async () => false}
        />
      );
    }
    
    if (game.status === 'finished') {
      return (
        <GameFinished 
          isSinglePlayer={false}
          alivePlayers={players.filter(p => p.is_alive)}
          players={players}
          game={game}
          onBackHome={() => {}}
        />
      );
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 to-red-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <GameHeader 
          roomName={room.name}
          roomId={room.id}
          difficulty={room.difficulty}
          isSinglePlayer={false}
        />
        
        {/* Show word import option if word count is low */}
        {wordCount < 50000 && (
          <QuickWordImport />
        )}
        
        {renderGameContent()}
      </div>
    </div>
  );
};
