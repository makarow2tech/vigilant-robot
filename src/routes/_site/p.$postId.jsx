import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, Lock, Paperclip, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getPost, listComments } from "@/lib/server-fns";
import { useDecryptedComments, useDecryptedPosts } from "@/lib/useDecrypt";
import { getSessionPrivateKey } from "@/lib/vault";
import { useVaultVersion } from "@/lib/useVault";
import CommentComposer from "@/components/forum/CommentComposer";
import CommentNode from "@/components/forum/CommentNode";
import VaultDialog from "@/components/crypto/VaultDialog";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";

export const Route = createFileRoute("/_site/p/$postId")({
  loader: async ({ params }) => {
    const [post, comments] = await Promise.all([
      getPost({ data: { id: params.postId } }),
      listComments({ data: { postId: params.postId } }),
    ]);
    if (!post || post.is_removed) throw notFound();
    return { post, comments };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `KRYPT · ${loaderData?.post?.topic_name || "gönderi"}` }],
  }),
  component: PostPage,
});

function buildTree(comments) {
  const map = new Map();
  const roots = [];
  const sorted = [...comments].sort((a, b) => (b.score || 0) - (a.score || 0));
  sorted.forEach((comment) => map.set(comment.id, { ...comment, children: [] }));
  sorted.forEach((comment) => {
    const node = map.get(comment.id);
    const parent = comment.parent_id ? map.get(comment.parent_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return { roots, map };
}

function Thread({ nodes, decoded, onReply, onDeleted, depth = 0 }) {
  return nodes.map((node) => (
    <CommentNode
      key={node.id}
      comment={node}
      decoded={decoded[node.id]}
      depth={depth}
      onReply={onReply}
      onDeleted={onDeleted}
    >
      {node.children?.length > 0 && (
        <Thread nodes={node.children} decoded={decoded} onReply={onReply} onDeleted={onDeleted} depth={depth + 1} />
      )}
    </CommentNode>
  ));
}

function PostPage() {
  const { post, comments } = Route.useLoaderData();
  const { user } = useAuth();
  const vaultVersion = useVaultVersion();
  const decoded = useDecryptedPosts([post]);
  const decodedComments = useDecryptedComments(comments);
  const [extra, setExtra] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [vaultOpen, setVaultOpen] = useState(false);

  const all = useMemo(() => [...comments, ...extra], [comments, extra]);
  const { roots } = useMemo(() => buildTree(all), [all]);
  const entry = decoded[post.id];
  const isOwner = Boolean(user?.id && post.author_id === user.id);
  const unlocked = user?.id ? Boolean(getSessionPrivateKey(user.id)) : false;
  const isPrivate = post.visibility === "private";

  const ownerPublicKey = useMemo(() => {
    if (!isOwner) return null;
    return null;
  }, [isOwner]);

  return (
    <div className="pt-8">
      <Link to="/" className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-white">
        <ArrowLeft className="h-3 w-3" /> akış
      </Link>

      <article className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <span className="text-white/75">u/{post.author_name || "anon"}</span>
          {post.is_anon && <span className="rounded border border-white/15 px-1.5 text-[10px]">ANON</span>}
          {post.author_id && <ShieldCheck className="h-3 w-3 text-[hsl(var(--neon))]" />}
          {post.topic_slug && (
            <Link to="/t/$slug" params={{ slug: post.topic_slug }} className="text-[hsl(var(--neon))]/80">
              #{post.topic_name || post.topic_slug}
            </Link>
          )}
          {isPrivate && (
            <span className="inline-flex items-center gap-1 rounded border border-white/15 px-1.5 text-[10px]">
              <Lock className="h-2.5 w-2.5" /> ÖZEL · AES-256-GCM
            </span>
          )}
        </div>

        <h1 className="mt-3 text-balance font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {entry?.locked ? "Şifreli başlık" : entry?.title ?? <span className="inline-block h-7 w-2/3 animate-pulse rounded bg-white/10" />}
        </h1>

        <div className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed text-white/85">
          {entry?.locked ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <p className="flex items-center gap-2 font-heading text-sm text-white/80">
                <Lock className="h-4 w-4 text-[hsl(var(--neon))]" />
                {isOwner ? "Bu gönderi kendi anahtarınla şifreli." : "Bu gönderi yalnızca yazarının anahtarıyla okunabilir."}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Sunucu bu içeriği çözemez. {isOwner ? "Kasanı açarak içeriği görüntüleyebilirsin." : "Uçtan uca şifreleme gereği başka kimse okuyamaz."}
              </p>
              {isOwner && (
                <Button size="sm" onClick={() => setVaultOpen(true)} className="mt-4 rounded-xl bg-white text-black">
                  {unlocked ? "Anahtar hazır" : "Kasayı aç"}
                </Button>
              )}
            </div>
          ) : entry?.body === undefined ? (
            <span className="inline-block h-20 w-full animate-pulse rounded bg-white/[0.06]" />
          ) : (
            entry.body
          )}
        </div>

        {post.attachment_url && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
            {post.attachment_type?.startsWith("image/") ? (
              <Image
                src={post.attachment_url}
                alt={post.attachment_name || "ek"}
                className="max-h-[420px] w-full rounded-xl object-contain"
                fittingType="fit"
              />
            ) : (
              <a
                href={post.attachment_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-2 py-1 font-mono text-xs text-[hsl(var(--neon))]"
              >
                <Paperclip className="h-3.5 w-3.5" /> {post.attachment_name || "ek dosya"}
              </a>
            )}
          </div>
        )}
      </article>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">
            {all.length} şifreli yorum
          </h2>
          <span className="mono-label">AES-256 · sadece tarayıcıda çözülür</span>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <CommentComposer
            postId={post.id}
            visibility={post.visibility}
            ownerPublicKey={null}
            onCreated={(created) => setExtra((prev) => [...prev, created])}
          />
        </div>

        <div className="mt-4 divide-y divide-white/[0.06]">
          {roots.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">İlk şifreli yorumu sen yaz.</p>
          )}
          <Thread
            nodes={roots}
            decoded={decodedComments}
            onReply={(comment) => setReplyTo(comment)}
            onDeleted={(id) => setExtra((prev) => prev.filter((item) => item.id !== id))}
          />
        </div>

        {replyTo && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#08080c]/95 p-4 backdrop-blur">
            <div className="mx-auto max-w-3xl">
              <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>u/{replyTo.author_name} yanıtlanıyor</span>
                <button type="button" onClick={() => setReplyTo(null)}>kapat ✕</button>
              </div>
              <CommentComposer
                postId={post.id}
                visibility={post.visibility}
                parent={replyTo}
                compact
                onCreated={(created) => {
                  setExtra((prev) => [...prev, created]);
                  setReplyTo(null);
                }}
                onCancel={() => setReplyTo(null)}
              />
            </div>
          </div>
        )}
      </section>

      <VaultDialog open={vaultOpen} onOpenChange={setVaultOpen} key={vaultVersion} />
    </div>
  );
}