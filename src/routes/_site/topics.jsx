import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Lock } from "lucide-react";
import TopicCreator from "@/components/forum/TopicCreator";
import { getSiteConfig, listTopics } from "@/lib/server-fns";

export const Route = createFileRoute("/_site/topics")({
  loader: async () => {
    const [topics, configResult] = await Promise.all([listTopics(), getSiteConfig()]);
    return { topics, config: configResult.config };
  },
  head: () => ({ meta: [{ title: "KRYPT · topluluklar" }] }),
  component: TopicsPage,
});

function TopicsPage() {
  const { topics, config } = Route.useLoaderData();

  return (
    <div className="pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="mono-label">/ topluluklar</span>
          <h1 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
            topluluklar<span className="text-[hsl(var(--neon))]">_</span>
          </h1>
          <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
            Her topluluk kendi rengi, simgesi ve kurallarıyla ayrı bir alan. İçindeki her gönderi yine uçtan uca şifreli.
          </p>
        </div>
        {config.allow_new_topics && <TopicCreator />}
      </div>

      <div className="mt-8 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic, index) => (
          <Link
            key={topic.id}
            to="/t/$slug"
            params={{ slug: topic.slug }}
            className="lift animate-rise group relative overflow-hidden border border-[hsl(200_30%_18%)] bg-white/[0.02] p-5 hover:border-white/25"
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
          >
            <span
              className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
              style={{ background: topic.accent }}
            />
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center border font-display text-sm"
                  style={{ color: topic.accent, borderColor: `${topic.accent}55` }}
                >
                  {topic.icon || "#"}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-base font-semibold uppercase tracking-[0.06em] text-white">
                    #{topic.name}
                  </h2>
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                    {topic.post_count || 0} gönderi
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-[hsl(var(--neon))]" />
            </div>

            {topic.description && (
              <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{topic.description}</p>
            )}

            <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[hsl(var(--neon))]/70">
              <Lock className="h-3 w-3" /> şifreli alan
            </span>
          </Link>
        ))}
      </div>

      {topics.length === 0 && (
        <div className="mt-8 border border-dashed border-[hsl(200_30%_20%)] px-6 py-16 text-center font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          henüz topluluk yok · ilkini oluştur
        </div>
      )}

      {config.community_rules && (
        <div className="mt-6 hud-flat p-5">
          <h2 className="mono-label">genel kurallar</h2>
          <p className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">
            {config.community_rules}
          </p>
        </div>
      )}
    </div>
  );
}