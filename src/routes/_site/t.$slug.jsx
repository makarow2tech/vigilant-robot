import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import PostCard from "@/components/forum/PostCard";
import { listFeed, listTopics } from "@/lib/server-fns";
import { useDecryptedPosts } from "@/lib/useDecrypt";
import { sanitizeCss, sanitizeHtml } from "@/lib/sanitize";

export const Route = createFileRoute("/_site/t/$slug")({
  loader: async ({ params }) => {
    const [topics, feed] = await Promise.all([
      listTopics(),
      listFeed({ data: { sort: "top", topicSlug: params.slug, limit: 30 } }),
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
  const decoded = useDecryptedPosts(feed.items);
  const css = sanitizeCss(topic.custom_css || "");
  const html = sanitizeHtml(topic.custom_html || "");

  return (
    <div className="pt-8">
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <Link to="/topics" className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-white">
        <ArrowLeft className="h-3 w-3" /> topluluklar
      </Link>

      <header
        className="mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-6 sm:p-9"
        style={{ boxShadow: `0 0 80px -50px ${topic.accent}` }}
      >
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <>
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 font-heading text-lg"
              style={{ color: topic.accent, borderColor: `${topic.accent}55` }}
            >
              {topic.icon || "#"}
            </span>
            <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">#{topic.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{topic.description}</p>
          </>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted-foreground">
          <span>{topic.post_count || 0} gönderi</span>
          <span className="text-white/20">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-[hsl(var(--neon))]" /> uçtan uca şifreli
          </span>
          {topic.is_private && <span className="rounded border border-white/15 px-1.5 text-[10px]">KAPALI</span>}
        </div>
      </header>

      {topic.rules && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h2 className="mono-label">topluluk kuralları</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{topic.rules}</p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {feed.items?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/12 px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">Bu toplulukta henüz gönderi yok.</p>
            <Link to="/submit" className="mt-3 inline-block text-sm text-[hsl(var(--neon))]">
              İlk gönderiyi oluştur
            </Link>
          </div>
        )}
        {(feed.items || []).map((post, index) => (
          <PostCard key={post.id} post={post} decoded={decoded[post.id]} index={index} />
        ))}
      </div>
    </div>
  );
}