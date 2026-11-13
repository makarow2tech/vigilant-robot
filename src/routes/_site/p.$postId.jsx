import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, KeyRound, Lock, Paperclip, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useAnonId } from "@/lib/useAnon";
import { getPost, listComments } from "@/lib/server-fns";
import { useDecryptedComments, useDecryptedPosts } from "@/lib/useDecrypt";
import { useMyState } from "@/lib/useMyState";
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
    if (!post) throw notFound();
    return { post, comments };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.post?.topic_name ? `KRYPT · #${loaderData.post.topic_name}` : "KRYPT · gönderi" }],
  }),
  component: PostPage,
});

function buildTree(comments) {
  const sorted = [...comments].sort((a, b) =>
    String(a.created_date || "").localeCompare(String(b.created_date || ""))
  );
  const map = new Map();
  sorted.forEach((comment) => map.set(comment.id, { ...comment, children: [] }));
  const roots = [];
  sorted.forEach((comment) => {
    const node = map.get(comment.id);
    const parent = comment.parent_id ? map.get(comment.parent_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
}

function Thread({ nodes, decoded, myVotes, onReply, onDeleted, depth = 0 }) {
  return nodes.map((node) => (
    <CommentNode
      key={node.id}
      comment={node}
      decoded={decoded[node.id]}
      myVote={myVotes[node.id] || 0}
      depth={depth}
      onReply={onReply}
      onDeleted={onDeleted}
    >
      {node.children?.length > 0 && (
        <Thread
          nodes={node.children}
          decoded={decoded}
          myVotes={myVotes}
          onReply={onReply}
          onDeleted={onDeleted}
          depth={depth + 1}
        />
      )}
    </CommentNode>
  ));
}

function PostPage() {
  const { post, comments } = Route.useLoaderData();
  const anonId = useAnonId();
  const [extra, setExtra] = useState([]);
  const [removed, setRemoved] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [vaultOpen, setVaultOpen] = useState(false);

  const all = useMemo(
    () => [...(comments || []), ...extra].filter((comment) => !removed.includes(comment.id)),
    [comments, extra, removed]
  );

  const decodedPosts = useDecryptedPosts([post]);
  const decodedComments = useDecryptedComments(all);
  const myState = useMyState([post.id, ...all.map((comment) => comment.id)]);
  const roots = useMemo(() => buildTree(all), [all]);

  const entry = decodedPosts[post.id];
  const isPrivate = post.visibility === "private";
  const isOwner = Boolean(anonId && post.author_id === anonId);

  const handleRemove = (ids) => setRemoved((prev) => [...prev, ...(Array.isArray(ids) ? ids : [ids])]);

  return (
    <div className="pt-8 pb-10">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition hover:text-white"
      >
        <ArrowLeft className="h-3 w-3" /> akış
      </Link>

      <article className="mt-4 hud scanlines p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="text-white/75">{post.author_name || "anon"}</span>
          {post.is_anon && <span className="border border-white/15 px-1 text-[9px] text-white/50">anon</span>}
          {post.author_id && <ShieldCheck className="h-3 w-3 text-[hsl(var(--neon))]" />}
          {post.topic_slug && (
            <Link to="/t/$slug" params={{ slug: post.topic_slug }} className="text-[hsl(var(--neon))]/75">
              #{post.topic_name || post.topic_slug}
            </Link>
          )}
          {isPrivate && (
            <span className="inline-flex items-center gap-1 border border-white/15 px-1.5 text-[9px]">
              <Lock className="h-2.5 w-2.5" /> özel · aes-256-gcm
            </span>
          )}
        </div>

        <h1 className="mt-3 text-balance font-display text-2xl font-bold uppercase leading-tight tracking-tight text-white sm:text-4xl">
          {entry?.locked ? (
            "şifreli başlık"
          ) : entry?.title === undefined ? (
            <span className="inline-block h-7 w-2/3 animate-pulse bg-white/10" />
          ) : (
            entry.title
          )}
        </h1>

        <div className="mt-5 whitespace-pre-wrap text-[13px] leading-relaxed text-white/85">
          {entry?.locked ? (
            <div className="border border-white/10 bg-white/[0.02] p-5">
              <p className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.06em] text-white/80">
                <Lock className="h-4 w-4 text-[hsl(var(--neon))]" />
                {isOwner ? "bu gönderi kendi anahtarınla şifreli" : "bu gönderi yalnızca yazarının anahtarıyla okunabilir"}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                sunucu bu içeriği çözemez.{" "}
                {isOwner
                  ? "kasanı açarak içeriği görüntüleyebilirsin."
                  : "uçtan uca şifreleme gereği başka kimse okuyamaz."}
              </p>
              {isOwner && (
                <Button
                  size="sm"
                  onClick={() => setVaultOpen(true)}
                  className="mt-4 rounded-none bg-[hsl(var(--neon))] font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-black hover:bg-[hsl(var(--neon))]/85"
                >
                  <KeyRound className="mr-1.5 h-3.5 w-3.5" /> kasayı aç
                </Button>
              )}
            </div>
          ) : entry?.body === undefined ? (
            <span className="inline-block h-20 w-full animate-pulse bg-white/[0.06]" />
          ) : (
            entry.body
          )}
        </div>

        {post.attachment_url && (
          <div className="mt-6 border border-white/10 bg-white/[0.02] p-3">
            {post.attachment_type?.startsWith("image/") ? (
              <Image
                src={post.attachment_url}
                alt={post.attachment_name || "ek dosya"}
                className="max-h-[420px] w-full object-contain"
                fittingType="fit"
              />
            ) : (
              <a
                href={post.attachment_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-2 py-1 font-mono text-[11px] text-[hsl(var(--neon))]"
              >
                <Paperclip className="h-3.5 w-3.5" /> {post.attachment_name || "ek dosya"}
              </a>
            )}
          </div>
        )}
      </article>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold uppercase tracking-[0.08em] text-white">
            {all.length} şifreli yorum
          </h2>
          <span className="mono-label">aes-256 · yalnızca tarayıcıda çözülür</span>
        </div>

        <div className="mt-4 border border-[hsl(200_30%_18%)] bg-white/[0.02] p-4">
          {isPrivate && !isOwner ? (
            <p className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-muted-foreground">
              özel gönderi · yorumlar yalnızca yazar tarafından yazılabilir
            </p>
          ) : (
            <CommentComposer
              postId={post.id}
              visibility={post.visibility}
              ownerPublicKey={isPrivate ? post.owner_public_key : null}
              onCreated={(created) => setExtra((prev) => [...prev, created])}
            />
          )}
        </div>

        <div className="mt-4 divide-y divide-white/[0.05]">
          {roots.length === 0 && (
            <p className="py-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              ilk şifreli yorumu sen yaz
            </p>
          )}
          <Thread
            nodes={roots}
            decoded={decodedComments}
            myVotes={myState.votes}
            onReply={(comment) => setReplyTo(comment)}
            onDeleted={handleRemove}
          />
        </div>

        {replyTo && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[hsl(200_40%_20%)] bg-[#06060b]/95 p-4 backdrop-blur">
            <div className="mx-auto max-w-3xl">
              <div className="mb-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                <span>{replyTo.author_name} yanıtlanıyor</span>
                <button type="button" onClick={() => setReplyTo(null)} className="hover:text-white">
                  kapat ✕
                </button>
              </div>
              <CommentComposer
                postId={post.id}
                visibility={post.visibility}
                ownerPublicKey={isPrivate ? post.owner_public_key : null}
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

      <VaultDialog open={vaultOpen} onOpenChange={setVaultOpen} />
    </div>
  );
}