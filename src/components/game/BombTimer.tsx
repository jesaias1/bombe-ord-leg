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
      const t = setTimeout(() => setShake(false), 200);
      return () => clearTimeout(t);
    }
    setShake(false);
  }, [timeLeft, isActive]);

  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const isCritical = timeLeft <= 3;
  const isUrgent = timeLeft <= 5;

  // SVG ring
  const size = 100;
  const sw = 5;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);

  const ringColor = isCritical ? '#ef4444' : '#f97316';
  const glowColor = isCritical ? 'rgba(239,68,68,0.35)' : 'rgba(249,115,22,0.2)';

  return (
    <div className={cn("relative w-full h-full", shake && isActive && "animate-bounce")}>
      {/* Glow */}
      <div className="absolute inset-0 rounded-full blur-2xl transition-all duration-500"
           style={{ background: glowColor, transform: 'scale(0.9)' }} />

      {/* SVG Ring */}
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ringColor} strokeWidth={sw}
                strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
                className="transition-all duration-300 ease-linear"
                style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }} />
      </svg>

      {/* Inner content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={cn(
          "w-[76%] h-[76%] rounded-full flex flex-col items-center justify-center transition-all",
          !isActive && "opacity-40 grayscale"
        )} style={{ backgroundColor: isCritical ? '#1c0a0a' : '#1a120a' }}>
          <div className={cn(
            "font-black text-center leading-none tracking-wide",
            "text-3xl sm:text-4xl",
            isCritical ? "text-red-400" : "text-orange-300"
          )}>
            {syllable.toUpperCase()}
          </div>
          <div className={cn(
            "mt-1 font-mono font-bold text-sm",
            isCritical ? "text-red-400/80 animate-pulse" : "text-white/40"
          )}>
            {timeLeft}s
          </div>
        </div>
      </div>

      {/* Sparks */}
      {isCritical && isActive && (
        <div className="absolute inset-0 rounded-full pointer-events-none">
          <div className="absolute top-1 left-1/2 w-1 h-1 bg-red-400 rounded-full animate-ping" />
          <div className="absolute bottom-2 right-3 w-1 h-1 bg-orange-300 rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
        </div>
      )}
    </div>
  );
};