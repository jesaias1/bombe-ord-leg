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
  const isCritical = timeLeft <= 3;

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Mobile-optimized bomb timer */}
      <div
        className={cn(
          "relative rounded-full flex items-center justify-center text-white font-bold transition-all duration-300",
          "border-4 shadow-2xl",
          // Responsive sizing - smaller on mobile
          "w-36 h-36 sm:w-48 sm:h-48",
          // Color states
          isCritical ? "bg-red-600 border-red-800 animate-pulse" : 
          isUrgent ? "bg-orange-600 border-orange-800" : 
          "bg-orange-500 border-orange-700",
          // Animation states
          shake && isActive && "animate-bounce",
          !isActive && "opacity-50 grayscale"
        )}
        style={{
          background: `conic-gradient(${
            isCritical ? '#dc2626' : isUrgent ? '#ea580c' : '#f97316'
          } ${progress}%, #374151 ${progress}%)`
        }}
      >
        {/* Inner circle with content */}
        <div className={cn(
          "absolute inset-3 rounded-full flex flex-col items-center justify-center shadow-inner",
          isCritical ? "bg-red-500" : isUrgent ? "bg-orange-500" : "bg-orange-400"
        )}>
          {/* Syllable - responsive text size */}
          <div className={cn(
            "font-display font-black text-center leading-tight mb-1",
            "text-3xl sm:text-5xl",
            "drop-shadow-lg"
          )}>
            {syllable.toUpperCase()}
          </div>
          
          {/* Timer - responsive text size */}
          <div className={cn(
            "font-bold drop-shadow-md",
            "text-sm sm:text-lg",
            isCritical && "animate-pulse"
          )}>
            {timeLeft}s
          </div>
        </div>

        {/* Spark effect for critical state */}
        {isCritical && isActive && (
          <div className="absolute inset-0 rounded-full">
            <div className="absolute top-0 left-1/2 w-2 h-2 bg-yellow-300 rounded-full animate-ping" 
                 style={{ transform: 'translate(-50%, -200%)' }} />
            <div className="absolute bottom-0 right-0 w-1 h-1 bg-red-300 rounded-full animate-ping"
                 style={{ animationDelay: '0.2s' }} />
            <div className="absolute top-1/2 left-0 w-1 h-1 bg-orange-300 rounded-full animate-ping"
                 style={{ transform: 'translate(-200%, -50%)', animationDelay: '0.4s' }} />
          </div>
        )}
      </div>

      {/* Status indicator for mobile */}
      <div className={cn(
        "text-center font-medium transition-all duration-300",
        "text-sm sm:text-base",
        isCritical ? "text-red-600 animate-pulse" : 
        isUrgent ? "text-orange-600" : 
        "text-orange-500"
      )}>
        {!isActive ? "Spillet er pauset" :
         timeLeft <= 0 ? "💥 BOOM! 💥" :
         isCritical ? "🔥 KRITISK!" :
         isUrgent ? "⚠️ Skyndt dig!" :
         "💭 Tænk på et ord..."}
      </div>
    </div>
  );
};