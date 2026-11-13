import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, Lock, MessageSquare, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { voterKey } from "@/lib/anon";
import { useAnonHash, useAnonId } from "@/lib/useAnon";
import { deletePost, toggleBookmark, vote } from "@/lib/server-fns";
import VoteControl from "@/components/forum/VoteControl";
import VaultDialog, { VaultLockedChip } from "@/components/crypto/VaultDialog";
import { cn } from "@/lib/utils";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });
}

export default function PostCard({ post, decoded, index = 0, onDeleted }) {
  const { user } = useAuth();
  const anonHash = useAnonHash();
  const anonId = useAnonId();
  const castVote = useServerFn(vote);
  const savePost = useServerFn(toggleBookmark);
  const removePost = useServerFn(deletePost);

  const [score, setScore] = useState(post.score ?? 0);
  const [myVote, setMyVote] = useState(0);
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [removed, setRemoved] = useState(false);

  const isPrivate = post.visibility === "private";
  const canDelete =
    (user?.id && post.author_id === user.id) || (post.is_anon === true && !!anonId && post.author_id === anonId);

  if (removed || post.is_removed) return null;

  const handleVote = async (value) => {
    try {
      const result = await castVote({
        data: { targetType: "post", targetId: post.id, voterKey: voterKey(user), value },
      });
      setScore(result.score);
      setMyVote(result.myVote);
    } catch (error) {
      toast.error(error?.message || "Oy kaydedilemedi.");
    }
  };

  const handleSave = async () => {
    const result = await savePost({ data: { postId: post.id, voterKey: voterKey(user) } });
    setSaved(result.saved);
    toast.success(result.saved ? "Kaydedildi" : "Kayıttan çıkarıldı");
  };

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    try {
      await removePost({ data: { id: post.id, anonSecretHash: anonHash || "" } });
      setRemoved(true);
      onDeleted?.(post.id);
      toast.success("Gönderi silindi");
    } catch (error) {
      toast.error(error?.message || "Silinemedi.");
    }
  };

  const title = decoded?.title;
  const body = decoded?.body;

  return (
    <article
      className={cn(
        "lift group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 animate-rise sm:p-5",
        "hover:border-[hsl(var(--neon))]/35 hover:bg-white/[0.05] hover:shadow-[0_0_50px_-20px_hsl(var(--neon))]"
      )}
      style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
    >
      <div className="flex gap-4">
        <div className="hidden shrink-0 flex-col items-center gap-3 sm:flex">
          <VoteControl score={score} value={myVote} onVote={handleVote} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span className="text-white/70">u/{post.author_name || "anon"}</span>
            {post.is_anon && (
              <span className="rounded-md border border-white/15 px-1.5 py-0 text-[10px] text-white/60">ANONİM</span>
            )}
            {post.author_id && <ShieldCheck className="h-3 w-3 text-[hsl(var(--neon))]" />}
            <span className="text-white/20">·</span>
            <span>{formatDate(post.created_date)}</span>
            {post.topic_slug && (
              <>
                <span className="text-white/20">·</span>
                <Link to="/t/$slug" params={{ slug: post.topic_slug }} className="text-[hsl(var(--neon))]/80 hover:text-[hsl(var(--neon))]">
                  #{post.topic_name || post.topic_slug}
                </Link>
              </>
            )}
            {post.flair && (
              <span className="rounded-md border border-[hsl(var(--neon-2))]/30 bg-[hsl(var(--neon-2))]/10 px-1.5 py-0.5 text-[10px] text-[hsl(var(--neon-2))]">
                {post.flair}
              </span>
            )}
            {isPrivate && (
              <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/70">
                <Lock className="h-2.5 w-2.5" /> ÖZEL
              </span>
            )}
            {post.is_pinned && (
              <span className="rounded-md border border-white/20 px-1.5 py-0.5 text-[10px] text-white/70">SABİT</span>
            )}
          </div>

          <Link to="/p/$postId" params={{ postId: post.id }} className="mt-2 block">
            <h3 className="text-balance font-heading text-lg font-semibold leading-snug tracking-tight text-white transition group-hover:text-[hsl(var(--neon))] sm:text-xl">
              {decoded?.locked ? (
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Lock className="h-4 w-4" /> Şifreli başlık
                </span>
              ) : title === undefined ? (
                <span className="inline-block h-5 w-2/3 animate-pulse rounded bg-white/10" />
              ) : (
                title
              )}
            </h3>
          </Link>

          {decoded?.locked ? (
            <div className="mt-2">
              <VaultLockedChip label="Sadece anahtar sahibi okuyabilir" onUnlock={() => setVaultOpen(true)} />
            </div>
          ) : (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {body === undefined ? (
                <span className="inline-block h-4 w-full animate-pulse rounded bg-white/[0.06]" />
              ) : (
                body
              )}
            </p>
          )}

          <div className="mt-4 flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> {post.comment_count || 0}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[hsl(var(--neon))]/60">
              <Lock className="h-3 w-3" /> AES-256
            </span>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={handleSave}
                aria-label="Kaydet"
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-lg transition hover:bg-white/10",
                  saved ? "text-[hsl(var(--neon))]" : "text-muted-foreground"
                )}
              >
                <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} />
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className={cn(
                    "rounded-lg px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition hover:bg-destructive/15 hover:text-destructive",
                    confirming ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {confirming ? (
                    <span className="inline-flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> emin misin
                    </span>
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