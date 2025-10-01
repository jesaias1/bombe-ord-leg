import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ExplosionFeedbackProps {
  playerName?: string;
  onComplete: () => void;
}

export const ExplosionFeedback = ({ playerName, onComplete }: ExplosionFeedbackProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 300); // Wait for fade out animation
    }, 2000); // Show for 2 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300",
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
              {playerName} mistede et liv
            </p>
          )}
        </div>

        {/* Pulsing effect */}
        <div className="absolute inset-0 bg-red-500/20 animate-pulse rounded-full blur-3xl" />
      </div>
    </div>
  );
};
