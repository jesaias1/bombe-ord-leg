import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ExplosionFeedbackProps {
  playerName?: string;
  isMe?: boolean;
  onComplete: () => void;
}

export const ExplosionFeedback = ({ playerName, isMe, onComplete }: ExplosionFeedbackProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 300); // Wait for fade out animation
    }, isMe ? 1200 : 800); // Shorter for others

    return () => clearTimeout(timer);
  }, [onComplete, isMe]);

  if (!isMe) {
    // Subtle toast for others
    return (
      <div className={cn(
        "fixed top-20 left-1/2 -translate-x-1/2 z-[100] pointer-events-none transition-opacity duration-300",
        show ? "opacity-100" : "opacity-0"
      )}>
        <div className="bg-slate-900/90 border border-white/10 text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-3">
          <span className="text-xl">💥</span>
          <span className="text-sm font-medium">
            <span className="text-red-400 font-bold">{playerName}</span> mistede et liv
          </span>
        </div>
      </div>
    );
  }

  // Full screen for me
  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300 pointer-events-none",
        show ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="text-center space-y-6 animate-scale-in">
        {/* Explosion animation */}
        <div className="text-9xl animate-bounce">
          💥
        </div>
        
        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-4xl font-bold text-white drop-shadow-lg">
            Bomben sprang!
          </h2>
          {playerName && (
            <p className="text-2xl text-red-400 font-semibold">
              Du mistede et liv
            </p>
          )}
        </div>

        {/* Pulsing effect */}
        <div className="absolute inset-0 bg-red-500/20 animate-pulse rounded-full blur-3xl" />
      </div>
    </div>
  );
};
