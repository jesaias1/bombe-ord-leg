
import React from 'react';
import { BombTimer } from './BombTimer';
import { ExplosionFeedback } from './ExplosionFeedback';
import { UsedWordsList } from './UsedWordsList';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { Heart, Trophy, UserRoundX } from 'lucide-react';
import { useGameInput } from '@/hooks/useGameInput';
import { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { soundManager } from '@/utils/SoundManager';
import { hapticManager } from '@/utils/HapticManager';

type Player = Tables<'players'>;
type Game = Tables<'games'>;
type GameWithTurn = Game & { turn_seq?: number | null };
type GameRuntimeWindow = Window & {
  __lastTurnSeq?: number;
  __lastCurrentPlayerId?: string | null;
  [key: `__playerLives_${string}`]: number | undefined;
};

interface GamePlayingProps {
  game: Game;
  players: Player[];
  timeLeft: number;
  currentPlayer?: Player;
  isCurrentUser: boolean;
  isSinglePlayer: boolean;
  currentUserId?: string;
  gameInput: ReturnType<typeof useGameInput>;
}

export const GamePlaying = ({
  game,
  players,
  timeLeft,
  currentPlayer,
  isCurrentUser,
  isSinglePlayer,
  currentUserId,
  gameInput
}: GamePlayingProps) => {
  const alivePlayers = players.filter(p => p.is_alive);
  const deadPlayers = players.filter(p => !p.is_alive);
  const [showExplosion, setShowExplosion] = useState(false);
  const [explosionPlayer, setExplosionPlayer] = useState<string>();
  const [explosionIsMe, setExplosionIsMe] = useState(false);
  const gameWithTurn = game as GameWithTurn;
  const currentTurnSeq = gameWithTurn.turn_seq;
  const playerLivesKey = players.map(p => `${p.id}-${p.lives}`).join(',');

  // Track per-player word counts client-side
  const wordCountsRef = useRef<Record<string, number>>({});
  const lastWordCountRef = useRef<number>(0);

  useEffect(() => {
    const totalWords = game.correct_words?.length || game.used_words?.length || 0;
    const gameRuntime = window as GameRuntimeWindow;
    const lastTurnSeq = gameRuntime.__lastTurnSeq;

    // If a new word was accepted
    if (totalWords > lastWordCountRef.current) {
      // Trigger confetti if it was ME who submitted (or always if single player)
      const prevPlayerId = gameRuntime.__lastCurrentPlayerId;
      const wasMe = prevPlayerId === (players.find(p => p.user_id === currentUserId)?.id);
      
      if (wasMe || isSinglePlayer) {
        soundManager.playSuccess();
        hapticManager.vibrateSuccess();
        confetti({
          particleCount: 40,
          spread: 70,
          origin: { y: 0.8 },
          colors: ['#34d399', '#fbbf24', '#f87171'] // Emerald, Amber, Red
        });
      }

      if (prevPlayerId && lastTurnSeq !== undefined) {
        wordCountsRef.current[prevPlayerId] = (wordCountsRef.current[prevPlayerId] || 0) + 1;
      }
    }
    lastWordCountRef.current = totalWords;

    // Track explosion (life loss)
    if (lastTurnSeq !== undefined && typeof currentTurnSeq === 'number' && currentTurnSeq > lastTurnSeq) {
      const lostLifePlayer = players.find(p => {
        const prevLives = gameRuntime[`__playerLives_${p.id}`];
        return prevLives !== undefined && p.lives < prevLives;
      });
      if (lostLifePlayer) {
        setExplosionPlayer(lostLifePlayer.name);
        setExplosionIsMe(lostLifePlayer.user_id === currentUserId);
        setShowExplosion(true);
        
        if (lostLifePlayer.user_id === currentUserId) {
            soundManager.playExplosion();
            hapticManager.vibrateExplosion();
        }
      }
    }

    if (typeof currentTurnSeq === 'number') gameRuntime.__lastTurnSeq = currentTurnSeq;
    gameRuntime.__lastCurrentPlayerId = game.current_player_id;
    players.forEach(p => { gameRuntime[`__playerLives_${p.id}`] = p.lives; });
  }, [currentTurnSeq, currentUserId, game, isSinglePlayer, playerLivesKey, players]);

  const currentUserPlayer = players.find(p => p.user_id === currentUserId);
  const isSpectating = currentUserPlayer && !currentUserPlayer.is_alive;
  const isMyTurn = isCurrentUser && currentUserPlayer?.is_alive;

  // Total words for solo display
  const totalWords = game.correct_words?.length || game.used_words?.length || 0;

  return (
    <>
      {showExplosion && (
        <ExplosionFeedback
          playerName={explosionPlayer}
          isMe={explosionIsMe}
          onComplete={() => { setShowExplosion(false); setExplosionPlayer(undefined); }}
        />
      )}

      {/* Players bar */}
      <div className="w-full max-w-2xl px-2">
        <div className="mb-2 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Trophy className="h-3.5 w-3.5 text-orange-300" />
          {alivePlayers.length} tilbage
          {deadPlayers.length > 0 && (
            <>
              <span className="text-slate-700">/</span>
              <UserRoundX className="h-3.5 w-3.5" />
              {deadPlayers.length} ude
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
        {alivePlayers.map(player => {
          const isActive = player.id === game.current_player_id;
          const isMe = player.user_id === currentUserId;
          const wordCount = wordCountsRef.current[player.id] || 0;
          return (
            <div key={player.id} className={cn(
              "flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all",
              isActive ? "border-orange-400/40 bg-orange-400/15 text-orange-100 shadow-lg shadow-orange-500/10" : "border-white/5 bg-white/[0.04] text-slate-400"
            )}>
              <div className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                isActive ? "bg-orange-500 text-white" : "bg-slate-700 text-slate-300"
              )}>
                {player.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="max-w-[84px] truncate font-semibold">
                  {player.name}{isMe ? " (dig)" : ""}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-px">
                    {Array.from({ length: player.lives }).map((_, i) => (
                      <Heart key={i} className="w-2 h-2 text-red-400 fill-red-400" />
                    ))}
                  </div>
                  {wordCount > 0 && (
                    <span className="text-[10px] font-mono text-emerald-300/90">{wordCount} ord</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Dead players shown dimmed */}
        {deadPlayers.map(player => (
          <div key={player.id} className="rounded-md border border-white/5 bg-white/[0.02] px-2 py-1 text-[10px] text-slate-600 line-through">
            {player.name}
          </div>
        ))}
        </div>
      </div>

      {/* Word counter (solo) or round info */}
      {isSinglePlayer && totalWords > 0 && (
        <div className="text-emerald-400/80 text-xs font-mono">
          {totalWords} ord
        </div>
      )}

      {/* Bomb timer */}
      <div className="ob-bomb-wrap">
        <BombTimer
          timeLeft={timeLeft}
          totalTime={game.timer_duration || 15}
          isActive={game.status === 'playing'}
          syllable={game.current_syllable || ''}
        />
      </div>

      {/* Used Words List Overlay */}
      <UsedWordsList words={game.correct_words || game.used_words || []} />

      {/* Status chip */}
      {isSpectating ? (
        <div className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
          Du er ude
        </div>
      ) : isMyTurn ? (
        <div className="animate-pulse rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1 text-xs text-orange-200">
          Din tur: {game.current_syllable?.toUpperCase()}
        </div>
      ) : currentPlayer ? (
        <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-400">
          {currentPlayer.name} tænker
        </div>
      ) : null}
    </>
  );
};
