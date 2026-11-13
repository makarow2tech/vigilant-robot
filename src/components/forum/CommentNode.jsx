import { ChevronDown, ChevronRight, Reply, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { voterKey } from "@/lib/anon";
import { useAnonHash, useAnonId } from "@/lib/useAnon";
import { useServerFn } from "@tanstack/react-start";
import { deleteComment, vote } from "@/lib/server-fns";
import VoteControl from "@/components/forum/VoteControl";
import { VaultLockedChip } from "@/components/crypto/VaultDialog";
import { cn } from "@/lib/utils";

export default function CommentNode({ comment, decoded, children, onReply, onDeleted, depth = 0 }) {
  const { user } = useAuth();
  const anonHash = useAnonHash();
  const anonId = useAnonId();
  const castVote = useServerFn(vote);
  const removeComment = useServerFn(deleteComment);
  const [score, setScore] = useState(comment.score ?? 0);
  const [myVote, setMyVote] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  const canDelete =
    (user?.id && comment.author_id === user.id) ||
    (comment.is_anon === true && !!anonId && comment.author_id === anonId);

  const handleVote = async (value) => {
    try {
      const result = await castVote({
        data: { targetType: "comment", targetId: comment.id, voterKey: voterKey(user), value },
      });
      setScore(result.score);
      setMyVote(result.myVote);
    } catch (error) {
      toast.error(error?.message || "Oy kaydedilemedi.");
    }
  };

  const handleDelete = async () => {
    try {
      await removeComment({ data: { id: comment.id, anonSecretHash: anonHash || "" } });
      onDeleted?.(comment.id);
    } catch (error) {
      toast.error(error?.message || "Silinemedi.");
    }
  };

  return (
    <div className={cn("relative", depth > 0 && "ml-3 border-l border-white/10 pl-3 sm:ml-5 sm:pl-4")}>
      <div className="py-3">
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="grid h-4 w-4 place-items-center rounded text-muted-foreground hover:text-white"
            aria-label="Yorumu daralt"
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <span className="text-white/75">u/{comment.author_name || "anon"}</span>
          {comment.is_anon && (
            <span className="rounded border border-white/15 px-1 text-[10px] text-white/50">ANON</span>
          )}
          <span className="text-white/20">·</span>
          <span>{score} puan</span>
        </div>

        {!collapsed && (
          <>
            <div className="mt-2 pl-6 text-sm leading-relaxed text-white/85">
              {decoded?.locked ? (
                <VaultLockedChip label="Şifreli yorum" onUnlock={() => {}} />
              ) : decoded?.text === undefined ? (
                <span className="inline-block h-4 w-1/2 animate-pulse rounded bg-white/10" />
              ) : (
                <p className="whitespace-pre-wrap">{decoded.text}</p>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2 pl-6">
              <VoteControl compact score={score} value={myVote} onVote={handleVote} />
              <button
                type="button"
                onClick={() => onReply?.(comment)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:bg-white/5 hover:text-white"
              >
                <Reply className="h-3 w-3" /> yanıtla
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" /> sil
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