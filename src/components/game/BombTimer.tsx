
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface BombTimerProps {
  timeLeft: number;
  totalTime: number;
  isActive: boolean;
  syllable: string;
  wordResult?: 'success' | 'error' | null;
  onAnimationComplete?: () => void;
}

export const BombTimer = ({ 
  timeLeft, 
  totalTime, 
  isActive, 
  syllable,
  wordResult,
  onAnimationComplete
}: BombTimerProps) => {
  const [showResult, setShowResult] = useState(false);

  // Show result animation when wordResult changes
  useEffect(() => {
    if (wordResult) {
      setShowResult(true);
      const timer = setTimeout(() => {
        setShowResult(false);
        onAnimationComplete?.();
      }, 800); // Animation duration
      
      return () => clearTimeout(timer);
    }
  }, [wordResult, onAnimationComplete]);

  const percentage = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const radius = 140; // Increased from 120 to replace the orange ring
  const strokeWidth = 12; // Increased stroke width for better visibility
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getTimerColor = () => {
    if (timeLeft <= 5) return 'stroke-red-500';
    if (timeLeft <= 10) return 'stroke-orange-500';
    return 'stroke-green-500';
  };

  const getBombEmoji = () => {
    if (timeLeft <= 3) return '💥';
    if (timeLeft <= 5) return '🔥';
    return '💣';
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Main Timer Circle */}
      <div className="relative">
        {/* Result Animation Ring - Behind the timer */}
        {showResult && (
          <div className={cn(
            "absolute inset-0 rounded-full border-4 animate-pulse -z-10",
            wordResult === 'success' 
              ? "border-green-400 shadow-lg shadow-green-400/50" 
              : "border-red-400 shadow-lg shadow-red-400/50"
          )}>
            <div className={cn(
              "absolute inset-2 rounded-full border-2 animate-ping",
              wordResult === 'success' 
                ? "border-green-300" 
                : "border-red-300"
            )}></div>
          </div>
        )}

        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90 relative z-10"
        >
          {/* Background circle */}
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="text-gray-300"
          />
          {/* Progress circle with enhanced styling */}
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className={cn(
              getTimerColor(),
              "transition-all duration-1000 ease-linear drop-shadow-lg",
              timeLeft <= 5 && "animate-pulse"
            )}
            style={{
              filter: timeLeft <= 5 ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))' : 
                     timeLeft <= 10 ? 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.4))' :
                     'drop-shadow(0 0 8px rgba(34, 197, 94, 0.4))'
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <div className="text-6xl mb-2 animate-bounce">
            {getBombEmoji()}
          </div>
          <div className={cn(
            "text-4xl font-bold transition-all duration-300",
            showResult && wordResult === 'success' ? "text-green-600 scale-110" :
            showResult && wordResult === 'error' ? "text-red-600 scale-110" :
            timeLeft <= 5 ? "text-red-600" : "text-gray-800"
          )}>
            {timeLeft}
          </div>
        </div>
      </div>

      {/* Syllable display with result animation */}
      <div className={cn(
        "mt-8 px-8 py-4 rounded-xl font-bold text-3xl transition-all duration-300 relative z-30",
        showResult && wordResult === 'success' 
          ? "bg-green-100 text-green-800 border-2 border-green-400 shadow-lg scale-110" 
          : showResult && wordResult === 'error'
          ? "bg-red-100 text-red-800 border-2 border-red-400 shadow-lg scale-110"
          : "bg-white text-gray-800 shadow-lg border-2 border-gray-200"
      )}>
        {/* Result ring around syllable */}
        {showResult && (
          <div className={cn(
            "absolute -inset-2 rounded-xl border-2 animate-pulse -z-10",
            wordResult === 'success' 
              ? "border-green-400 shadow-green-400/30" 
              : "border-red-400 shadow-red-400/30"
          )}></div>
        )}
        <span className="relative z-10">{syllable}</span>
      </div>
    </div>
  );
};
