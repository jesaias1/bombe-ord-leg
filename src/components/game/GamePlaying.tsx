
import React from 'react';
import { BombTimer } from './BombTimer';
import { ExplosionFeedback } from './ExplosionFeedback';
import { UsedWordsList } from './UsedWordsList';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { Heart } from 'lucide-react';
import { useGameInput } from '@/hooks/useGameInput';
import { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { soundManager } from '@/utils/SoundManager';
import { hapticManager } from '@/utils/HapticManager';

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

  // Track per-player word counts client-side
  const wordCountsRef = useRef<Record<string, number>>({});
  const lastWordCountRef = useRef<number>(0);

  useEffect(() => {
    const totalWords = game.correct_words?.length || game.used_words?.length || 0;
    const lastTurnSeq = (window as any).__lastTurnSeq;
    const currentTurnSeq = (game as any)?.turn_seq;

    // If a new word was accepted
    if (totalWords > lastWordCountRef.current) {
      // Trigger confetti if it was ME who submitted (or always if single player)
      const prevPlayerId = (window as any).__lastCurrentPlayerId;
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
    if (lastTurnSeq !== undefined && currentTurnSeq > lastTurnSeq) {
      const lostLifePlayer = players.find(p => {
        const prevLives = (window as any)[`__playerLives_${p.id}`];
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

    (window as any).__lastTurnSeq = currentTurnSeq;
    (window as any).__lastCurrentPlayerId = game.current_player_id;
    players.forEach(p => { (window as any)[`__playerLives_${p.id}`] = p.lives; });
  }, [(game as any)?.turn_seq, game.correct_words?.length, game.used_words?.length, players.map(p => `${p.id}-${p.lives}`).join(',')]);

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
      <div className="flex flex-wrap items-center justify-center gap-2 px-2 w-full max-w-lg">
        {alivePlayers.map(player => {
          const isActive = player.id === game.current_player_id;
          const isMe = player.user_id === currentUserId;
          const wordCount = wordCountsRef.current[player.id] || 0;
          return (
            <div key={player.id} className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all",
              isActive ? "bg-orange-500/20 border border-orange-500/30 text-orange-300" : "bg-white/5 border border-transparent text-slate-400"
            )}>
              <div className={cn(
                "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0",
                isActive ? "bg-orange-500 text-white" : "bg-slate-700 text-slate-400"
              )}>
                {player.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="max-w-[56px] truncate font-medium">
                  {player.name}{isMe ? " ★" : ""}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-px">
                    {Array.from({ length: player.lives }).map((_, i) => (
                      <Heart key={i} className="w-2 h-2 text-red-400 fill-red-400" />
                    ))}
                  </div>
                  {wordCount > 0 && (
                    <span className="text-[9px] text-emerald-400/80 font-mono">{wordCount}w</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Dead players shown dimmed */}
        {deadPlayers.map(player => (
          <div key={player.id} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] bg-white/3 text-slate-600 line-through">
            {player.name}
          </div>
        ))}
      </div>

      {/* Word counter (solo) or round info */}
      {isSinglePlayer && totalWords > 0 && (
        <div className="text-emerald-400/80 text-xs font-mono">
          ✅ {totalWords} ord
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
        <div className="text-purple-400 text-xs bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
          👀 Du er ude
        </div>
      ) : isMyTurn ? (
        <div className="text-orange-300 text-xs bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20 animate-pulse">
          🎯 Din tur — skriv et ord med "{game.current_syllable}"
        </div>
      ) : currentPlayer ? (
        <div className="text-slate-500 text-xs">
          {currentPlayer.name} tænker...
        </div>
      ) : null}
    </>
  );
};
