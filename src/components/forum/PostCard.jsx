import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, Lock, MessageSquare, ShieldCheck, Trash2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { voterKey } from "@/lib/anon";
import { useAnonHash, useAnonId } from "@/lib/useAnon";
import { deletePost, toggleBookmark, vote } from "@/lib/server-fns";
import VoteControl from "@/components/forum/VoteControl";
import VaultDialog, { VaultLockedChip } from "@/components/crypto/VaultDialog";
import { cn } from "@/lib/utils";

function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });
  } catch {
    return "";
  }
}

export default function PostCard({ post, decoded, index = 0, myVote = 0, saved = false, onDeleted }) {
  const anonHash = useAnonHash();
  const anonId = useAnonId();
  const castVote = useServerFn(vote);
  const savePost = useServerFn(toggleBookmark);
  const removePost = useServerFn(deletePost);

  const [score, setScore] = useState(post.score ?? 0);
  const [voteValue, setVoteValue] = useState(myVote);
  const [isSaved, setIsSaved] = useState(Boolean(saved));
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [removed, setRemoved] = useState(false);

  // kayıtlı oy / kayıt durumu sonradan yüklenir
  useEffect(() => setVoteValue(myVote), [myVote]);
  useEffect(() => setIsSaved(Boolean(saved)), [saved]);

  const isPrivate = post.visibility === "private";
  const canDelete = Boolean(anonId && post.author_id === anonId);

  if (removed || post.is_removed) return null;

  const handleVote = async (value) => {
    try {
      const result = await castVote({
        data: { targetType: "post", targetId: post.id, voterKey: voterKey(), value },
      });
      setScore(result.score);
      setVoteValue(result.myVote);
    } catch (error) {
      toast.error(error?.message || "Oy kaydedilemedi.");
    }
  };

  const handleSave = async () => {
    try {
      const result = await savePost({ data: { postId: post.id, voterKey: voterKey() } });
      setIsSaved(result.saved);
      toast.success(result.saved ? "Kaydedildi" : "Kayıttan çıkarıldı");
    } catch (error) {
      toast.error(error?.message || "Kaydedilemedi.");
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
    setBusy(true);
    try {
      await removePost({ data: { id: post.id, anonSecretHash: anonHash } });
      setRemoved(true);
      onDeleted?.(post.id);
      toast.success("Gönderi silindi");
    } catch (error) {
      toast.error(error?.message || "Silinemedi.");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  const title = decoded?.title;
  const body = decoded?.body;

  return (
    <article
      className="lift animate-rise group relative border border-[hsl(200_30%_18%)] bg-white/[0.02] p-4 hover:border-[hsl(var(--neon))]/40 hover:bg-white/[0.04] sm:p-5"
      style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
    >
      <div className="flex gap-4">
        <div className="hidden shrink-0 flex-col items-start gap-3 sm:flex">
          <VoteControl score={score} value={voteValue} onVote={handleVote} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span className="text-white/70">{post.author_name || "anon"}</span>
            {post.is_anon && <span className="border border-white/15 px-1 text-[9px] text-white/50">anon</span>}
            {post.author_id && <ShieldCheck className="h-3 w-3 text-[hsl(var(--neon))]" />}
            <span className="text-white/15">·</span>
            <span>{formatDate(post.created_date)}</span>
            {post.topic_slug && (
              <>
                <span className="text-white/15">·</span>
                <Link
                  to="/t/$slug"
                  params={{ slug: post.topic_slug }}
                  className="text-[hsl(var(--neon))]/75 transition hover:text-[hsl(var(--neon))]"
                >
                  #{post.topic_name || post.topic_slug}
                </Link>
              </>
            )}
            {post.flair && (
              <span className="border border-[hsl(var(--neon-2))]/30 bg-[hsl(var(--neon-2))]/10 px-1.5 py-0.5 text-[9px] text-[hsl(var(--neon-2))]">
                {post.flair}
              </span>
            )}
            {isPrivate && (
              <span className="inline-flex items-center gap-1 border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] text-white/70">
                <Lock className="h-2.5 w-2.5" /> özel
              </span>
            )}
          </div>

          <Link to="/p/$postId" params={{ postId: post.id }} className="mt-2 block">
            <h3 className="text-balance font-display text-lg font-semibold leading-snug tracking-tight text-white transition group-hover:text-[hsl(var(--neon))] sm:text-xl">
              {decoded?.locked ? (
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Lock className="h-4 w-4" /> Şifreli başlık
                </span>
              ) : title === undefined ? (
                <span className="inline-block h-5 w-2/3 animate-pulse bg-white/10" />
              ) : (
                title
              )}
            </h3>
          </Link>

          {decoded?.locked ? (
            <div className="mt-2">
              <VaultLockedChip label="yalnızca anahtar sahibi" onUnlock={() => setVaultOpen(true)} />
            </div>
          ) : (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {body === undefined ? (
                <span className="inline-block h-4 w-full animate-pulse bg-white/[0.06]" />
              ) : (
                body
              )}
            </p>
          )}

          <div className="mt-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 sm:hidden">
              <Zap className="h-3 w-3 text-[hsl(var(--neon))]" /> {score}
            </span>
            <Link
              to="/p/$postId"
              params={{ postId: post.id }}
              className="inline-flex items-center gap-1.5 transition hover:text-white"
            >
              <MessageSquare className="h-3.5 w-3.5" /> {post.comment_count || 0}
            </Link>
            <span className="hidden items-center gap-1.5 text-[hsl(var(--neon-3))]/50 sm:inline-flex">
              <Lock className="h-3 w-3" /> AES-256
            </span>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={handleSave}
                aria-label="Kaydet"
                className={cn(
                  "grid h-7 w-7 place-items-center transition hover:bg-white/10",
                  isSaved ? "text-[hsl(var(--neon))]" : "text-muted-foreground"
                )}
              >
                <Bookmark className={cn("h-3.5 w-3.5", isSaved && "fill-current")} />
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className={cn(
                    "px-1.5 py-1 transition hover:bg-destructive/15 hover:text-destructive",
                    confirming ? "text-destructive" : "text-muted-foreground"
                  )}
                  aria-label="Gönderiyi sil"
                >
                  {confirming ? (
                    <span className="inline-flex items-center gap-1 text-[9px] uppercase">emin misin</span>
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <VaultDialog open={vaultOpen} onOpenChange={setVaultOpen} />
    </article>
  );
}