import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface UsedWordsListProps {
  words: string[];
}

export const UsedWordsList = ({ words }: UsedWordsListProps) => {
  if (!words || words.length === 0) return null;

  return (
    <div className="absolute top-2 left-2 z-10 max-w-[120px] sm:max-w-[160px] flex flex-col gap-1 pointer-events-none opacity-60 hover:opacity-100 transition-opacity">
      <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-1">
        Brugte ord ({words.length})
      </div>
      <div className="bg-black/40 backdrop-blur-md rounded-lg border border-white/5 overflow-hidden pointer-events-auto">
        <ScrollArea className="h-[120px] sm:h-[180px] w-full px-2 py-1.5">
          <div className="flex flex-col gap-0.5">
            {[...words].reverse().map((word, i) => (
              <div key={i} className="text-xs text-slate-300 font-mono truncate">
                {word}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
