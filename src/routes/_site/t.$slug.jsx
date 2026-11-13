import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, Lock } from "lucide-react";
import PostCard from "@/components/forum/PostCard";
import { listFeed, listTopics } from "@/lib/server-fns";
import { useDecryptedPosts } from "@/lib/useDecrypt";
import { useMyState } from "@/lib/useMyState";

export const Route = createFileRoute("/_site/t/$slug")({
  loader: async ({ params }) => {
    const [topics, feed] = await Promise.all([
      listTopics(),
      listFeed({ data: { sort: "top", topicSlug: params.slug, limit: 50 } }),
    ]);
    const topic = (topics || []).find((item) => item.slug === params.slug);
    if (!topic) throw notFound();
    return { topic, feed };
  },
  head: ({ loaderData }) => ({ meta: [{ title: `KRYPT · #${loaderData?.topic?.name || "topluluk"}` }] }),
  component: TopicPage,
});

function TopicPage() {
  const { topic, feed } = Route.useLoaderData();
  const items = feed.items || [];
  const decoded = useDecryptedPosts(items);
  const myState = useMyState(items.map((post) => post.id));

  return (
    <div className="pt-8">
      <Link
        to="/topics"
        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition hover:text-white"
      >
        <ArrowLeft className="h-3 w-3" /> topluluklar
      </Link>

      <header
        className="mt-4 overflow-hidden hud scanlines p-6 sm:p-9"
        style={{ boxShadow: `0 0 100px -70px ${topic.accent}` }}
      >
        <span
          className="inline-flex h-11 w-11 items-center justify-center border font-display text-lg"
          style={{ color: topic.accent, borderColor: `${topic.accent}55` }}
        >
          {topic.icon || "#"}
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
          #{topic.name}
        </h1>
        {topic.description && (
          <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground">{topic.description}</p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>{topic.post_count || 0} gönderi</span>
          <span className="text-white/15">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-[hsl(var(--neon))]" /> uçtan uca şifreli
          </span>
        </div>
      </header>

      {topic.rules && (
        <div className="mt-4 hud-flat p-4">
          <h2 className="mono-label">topluluk kuralları</h2>
          <p className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">
            {topic.rules}
          </p>
        </div>
      )}

      <div className="mt-6 space-y-2.5">
        {items.length === 0 && (
          <div className="border border-dashed border-[hsl(200_30%_20%)] px-6 py-12 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              bu toplulukta henüz gönderi yok
            </p>
            <Link to="/submit" className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--neon))]">
              ilk gönderiyi oluştur →
            </Link>
          </div>
        )}
        {items.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            decoded={decoded[post.id]}
            index={index}
            myVote={myState.votes[post.id] || 0}
            saved={Boolean(myState.saved[post.id])}
          />
        ))}
      </div>
    </div>
  );
}