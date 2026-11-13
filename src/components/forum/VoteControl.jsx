import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VoteControl({ score = 0, value = 0, onVote, disabled = false, compact = false }) {
  const button = "grid place-items-center rounded-full transition hover:bg-white/10 disabled:opacity-40";
  const size = compact ? "h-6 w-6" : "h-7 w-7";

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1",
        compact ? "text-[11px]" : "text-xs"
      )}
    >
      <button
        type="button"
        aria-label="Yukarı oy"
        disabled={disabled}
        onClick={() => onVote?.(1)}
        className={cn(
          button,
          size,
          value === 1 ? "bg-[hsl(var(--neon))]/20 text-[hsl(var(--neon))] glow-ring" : "text-muted-foreground"
        )}
      >
        <ArrowBigUp className="h-4 w-4" />
      </button>
      <span className="min-w-[2rem] text-center font-mono font-medium tabular-nums">{score}</span>
      <button
        type="button"
        aria-label="Aşağı oy"
        disabled={disabled}
        onClick={() => onVote?.(-1)}
        className={cn(
          button,
          size,
          value === -1 ? "bg-[hsl(var(--neon-2))]/20 text-[hsl(var(--neon-2))]" : "text-muted-foreground"
        )}
      >
        <ArrowBigDown className="h-4 w-4" />
      </button>
    </div>
  );
}