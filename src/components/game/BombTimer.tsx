
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface BombTimerProps {
  timeLeft: number;
  totalTime: number;
  isActive: boolean;
  syllable: string;
}

export const BombTimer = ({ timeLeft, totalTime, isActive, syllable }: BombTimerProps) => {
  const [shake, setShake] = useState(false);
  
  useEffect(() => {
    if (timeLeft <= 3 && timeLeft > 0 && isActive) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 200);
      return () => clearTimeout(timer);
    } else {
      setShake(false);
    }
  }, [timeLeft, isActive]);

  const progress = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const isUrgent = timeLeft <= 5;

  return (
    <div className="flex flex-col items-center space-y-4">
      <div
        className={cn(
          "relative w-48 h-48 rounded-full flex items-center justify-center text-white font-bold text-lg",
          "border-4 transition-all duration-300",
          isUrgent ? "bg-red-600 border-red-800" : "bg-orange-500 border-orange-700",
          shake && isActive && "animate-pulse",
          !isActive && "opacity-50"
        )}
        style={{
          background: `conic-gradient(${isUrgent ? '#dc2626' : '#ea580c'} ${progress}%, #374151 ${progress}%)`
        }}
      >
        <div className={cn(
          "absolute inset-3 rounded-full flex flex-col items-center justify-center",
          isUrgent ? "bg-red-500" : "bg-orange-400"
        )}>
          <div className="text-5xl font-black text-center leading-tight mb-2">
            {syllable.toUpperCase()}
          </div>
          <div className="text-lg font-bold">
            {timeLeft}s
          </div>
        </div>
      </div>
      
      {timeLeft <= 0 && isActive && (
        <div className="text-2xl font-bold text-red-600 animate-bounce">
          💥 BOOM! 💥
        </div>
      )}
    </div>
  );
};
