import { ChevronDown, ChevronRight, Reply, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { voterKey } from "@/lib/anon";
import { useAnonHash, useAnonId } from "@/lib/useAnon";
import { useServerFn } from "@tanstack/react-start";
import { deleteComment, vote } from "@/lib/server-fns";
import VoteControl from "@/components/forum/VoteControl";
import { VaultLockedChip } from "@/components/crypto/VaultDialog";
import { cn } from "@/lib/utils";

export default function CommentNode({ comment, decoded, children, onReply, onDeleted, depth = 0, myVote = 0 }) {
  const anonHash = useAnonHash();
  const anonId = useAnonId();
  const castVote = useServerFn(vote);
  const removeComment = useServerFn(deleteComment);

  const [score, setScore] = useState(comment.score ?? 0);
  const [voteValue, setVoteValue] = useState(myVote);
  const [collapsed, setCollapsed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => setVoteValue(myVote), [myVote]);

  const canDelete = Boolean(anonId && comment.author_id === anonId);

  const handleVote = async (value) => {
    try {
      const result = await castVote({
        data: { targetType: "comment", targetId: comment.id, voterKey: voterKey(), value },
      });
      setScore(result.score);
      setVoteValue(result.myVote);
    } catch (error) {
      toast.error(error?.message || "Oy kaydedilemedi.");
    }
  };

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    if (!anonHash) {
      toast.error("Silme anahtarı hazır değil, bir saniye sonra tekrar dene.");
      return;
    }
    try {
      const result = await removeComment({ data: { id: comment.id, anonSecretHash: anonHash } });
      onDeleted?.(result?.removed || [comment.id]);
      toast.success("Yorum silindi");
    } catch (error) {
      toast.error(error?.message || "Silinemedi.");
      setConfirming(false);
    }
  };

  return (
    <div className={cn("relative", depth > 0 && "ml-3 border-l border-white/[0.08] pl-3 sm:ml-5 sm:pl-4")}>
      <div className="py-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="grid h-4 w-4 place-items-center text-muted-foreground transition hover:text-[hsl(var(--neon))]"
            aria-label="Yorumu daralt"
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <span className="text-white/75">{comment.author_name || "anon"}</span>
          {comment.is_anon && <span className="border border-white/15 px-1 text-[9px] text-white/45">anon</span>}
          <span className="text-white/15">·</span>
          <span>{score} puan</span>
        </div>

        {!collapsed && (
          <>
            <div className="mt-2 pl-6 text-[13px] leading-relaxed text-white/85">
              {decoded?.locked ? (
                <VaultLockedChip label="şifreli yorum" />
              ) : decoded?.text === undefined ? (
                <span className="inline-block h-4 w-1/2 animate-pulse bg-white/10" />
              ) : (
                <p className="whitespace-pre-wrap">{decoded.text}</p>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-6">
              <VoteControl compact score={score} value={voteValue} onVote={handleVote} />
              <button
                type="button"
                onClick={() => onReply?.(comment)}
                className="inline-flex items-center gap-1 px-1.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground transition hover:text-[hsl(var(--neon))]"
              >
                <Reply className="h-3 w-3" /> yanıtla
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] transition hover:text-destructive",
                    confirming ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  <Trash2 className="h-3 w-3" /> {confirming ? "emin misin" : "sil"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {!collapsed && children}
    </div>
  );
}