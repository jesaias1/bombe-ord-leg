
import React from 'react';
import { BombTimer } from './BombTimer';
import { PlayerList } from './PlayerList';
import { WordInput } from './WordInput';
import { PlayerCircle } from './PlayerCircle';
import { TurnIndicator } from './TurnIndicator';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

type Player = Tables<'players'>;
type Game = Tables<'games'>;

interface GamePlayingProps {
  game: Game;
  players: Player[];
  timeLeft: number;
  currentPlayer?: Player;
  isCurrentUser: boolean;
  isSinglePlayer: boolean;
  currentUserId?: string;
  onWordSubmit: (word: string) => Promise<boolean>;
  onWordChange?: (word: string) => void;
  isSubmitting?: boolean;
  currentWord?: string;
}

export const GamePlaying = ({
  game,
  players,
  timeLeft,
  currentPlayer,
  isCurrentUser,
  isSinglePlayer,
  currentUserId,
  onWordSubmit,
  isSubmitting = false,
  currentWord,
  onWordChange
}: GamePlayingProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-6 pb-20">
        {/* Timer */}
        <div className="text-center">
          <BombTimer 
            timeLeft={timeLeft} 
            totalTime={game.timer_duration || 15}
            isActive={game.status === 'playing'}
            syllable={game.current_syllable || ''}
          />
        </div>

        {/* Current syllable - prominent display */}
        <div className="text-center py-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
          <h2 className="text-xs text-muted-foreground mb-2">Find et ord med</h2>
          <div className="text-4xl font-bold text-primary mb-2">
            "{game.current_syllable}"
          </div>
          <p className="text-sm text-muted-foreground">
            {game.used_words?.length || 0} ord brugt
          </p>
        </div>

        {/* Player Circle - dramatic display */}
        <PlayerCircle 
          players={players}
          currentPlayerId={game.current_player_id || undefined}
          currentUserId={currentUserId}
          isSinglePlayer={isSinglePlayer}
        />

        {/* Turn Indicator */}
        <TurnIndicator 
          currentPlayer={currentPlayer}
          isCurrentUser={isCurrentUser}
          isSinglePlayer={isSinglePlayer}
        />

        {/* Word Input */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <WordInput
            onSubmit={onWordSubmit}
            disabled={!isCurrentUser || isSubmitting}
            currentSyllable={game.current_syllable || ''}
            isSubmitting={isSubmitting}
            onWordChange={onWordChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Game Area */}
      <div className="lg:col-span-2 space-y-8">
        {/* Timer and Turn Info */}
        <div className="text-center space-y-4">
          <BombTimer 
            timeLeft={timeLeft} 
            totalTime={game.timer_duration || 15}
            isActive={game.status === 'playing'}
            syllable={game.current_syllable || ''}
          />
          
          {/* Current syllable - prominent display */}
          <div className="py-8 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
            <h2 className="text-sm text-muted-foreground mb-3">Find et ord med</h2>
            <div className="text-6xl font-bold text-primary mb-4">
              "{game.current_syllable}"
            </div>
            <p className="text-muted-foreground">
              {game.used_words?.length || 0} ord brugt i denne runde
            </p>
          </div>
        </div>

        {/* Player Circle - dramatic display */}
        <div className="py-8">
          <PlayerCircle 
            players={players}
            currentPlayerId={game.current_player_id || undefined}
            currentUserId={currentUserId}
            isSinglePlayer={isSinglePlayer}
          />
        </div>

        {/* Turn Indicator */}
        <TurnIndicator 
          currentPlayer={currentPlayer}
          isCurrentUser={isCurrentUser}
          isSinglePlayer={isSinglePlayer}
        />

        {/* Word Input */}
        <div className="max-w-md mx-auto">
          <WordInput
            onSubmit={onWordSubmit}
            disabled={!isCurrentUser || isSubmitting}
            currentSyllable={game.current_syllable || ''}
            isSubmitting={isSubmitting}
            onWordChange={onWordChange}
          />
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Game Stats */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Spil Statistik</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Runde:</span>
              <span className="font-medium">{game.round_number || 1}</span>
            </div>
            <div className="flex justify-between">
              <span>Brugte ord:</span>
              <span className="font-medium">{game.used_words?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Spillere tilbage:</span>
              <span className="font-medium">{players.filter(p => p.is_alive).length}</span>
            </div>
          </div>
        </div>

        {/* Used Words */}
        {game.used_words && game.used_words.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Brugte Ord</h3>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {game.used_words.slice(-10).reverse().map((word, index) => (
                <div key={index} className="text-sm p-2 bg-background rounded border">
                  {word}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Classic Player List for reference */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Spillere</h3>
          <PlayerList 
            players={players}
            currentPlayerId={game.current_player_id || undefined}
            currentUserId={currentUserId}
          />
        </div>
      </div>
    </div>
  );
};
