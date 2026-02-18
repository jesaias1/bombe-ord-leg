import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { soundManager } from '@/utils/SoundManager';
import { hapticManager } from '@/utils/HapticManager';

interface BombTimerProps {
  timeLeft: number;
  totalTime: number;
  isActive: boolean;
  syllable: string;
}

export const BombTimer = ({ timeLeft, totalTime, isActive, syllable }: BombTimerProps) => {
  const lastTickRef = useRef<number>(timeLeft);

  useEffect(() => {
    if (isActive && timeLeft !== lastTickRef.current && timeLeft > 0) {
       const urgency = 1 - (timeLeft / totalTime);
       soundManager.playTick(urgency);
       hapticManager.vibrateTick(urgency);
       lastTickRef.current = timeLeft;
    }
  }, [timeLeft, isActive, totalTime]);
  const progress = totalTime > 0 ? Math.min(1, Math.max(0, timeLeft / totalTime)) : 0;
  const isCritical = timeLeft <= 3;

  // SVG ring
  const size = 100;
  const sw = 5;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);

  const ringColor = isCritical ? '#ef4444' : '#f97316';
  const glowColor = isCritical ? 'rgba(239,68,68,0.35)' : 'rgba(249,115,22,0.2)';

  return (
    <div className="relative w-full h-full">
      {/* Glow */}
      <div className="absolute inset-0 rounded-full blur-2xl transition-colors duration-500"
           style={{ background: glowColor, transform: 'scale(0.85)' }} />

      {/* SVG Ring — NO transition so it never "catches up" visually */}
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ringColor} strokeWidth={sw}
                strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
                style={{ 
                  filter: `drop-shadow(0 0 6px ${glowColor})`,
                  opacity: progress <= 0 ? 0 : 1
                }} />
      </svg>

      {/* Inner content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={cn(
          "w-[76%] h-[76%] rounded-full flex flex-col items-center justify-center",
          !isActive && "opacity-40 grayscale"
        )} style={{ backgroundColor: isCritical ? '#1c0a0a' : '#1a120a' }}>
          <div className={cn(
            "font-black text-center leading-none tracking-wide",
            "text-3xl sm:text-4xl",
            isCritical ? "text-red-400" : "text-orange-300",
            isCritical && isActive && "animate-pulse"
          )}>
            {syllable.toUpperCase()}
          </div>
          <div className={cn(
            "mt-1 font-mono font-bold text-sm",
            isCritical ? "text-red-400/80" : "text-white/40"
          )}>
            {timeLeft}s
          </div>
        </div>
      </div>
    </div>
  );
};