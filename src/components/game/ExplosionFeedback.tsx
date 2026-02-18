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
    }, 800); // Show for 0.8 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Unified non-blocking overlay for everyone
  return (
    <div
      className={cn(
        "fixed inset-x-0 top-[15%] z-[100] flex flex-col items-center justify-center pointer-events-none transition-opacity duration-300",
        show ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="text-center space-y-2 animate-bounce-in">
        {/* Explosion animation */}
        <div className="text-7xl drop-shadow-2xl filter brightness-110">
          💥
        </div>
        
        {/* Minimal Message */}
        <div className="bg-slate-900/90 backdrop-blur-md px-6 py-2 rounded-full border border-red-500/30 shadow-2xl">
           <span className="text-white font-bold text-lg">
             {isMe ? "Av! Du mistede et liv!" : `${playerName} mistede et liv!`}
           </span>
        </div>
      </div>
    </div>
  );
};
