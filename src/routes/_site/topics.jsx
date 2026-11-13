import { Link, createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
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
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Topluluklar</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Her başlık kendi kuralları, rengi ve isteğe bağlı HTML/CSS tasarımıyla ayrı bir alan.
          </p>
        </div>
        {config.allow_new_topics && <TopicCreator />}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic, index) => (
          <Link
            key={topic.id}
            to="/t/$slug"
            params={{ slug: topic.slug }}
            className="lift group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 animate-rise hover:border-white/25"
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
          >
            <span
              className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
              style={{ background: topic.accent }}
            />
            <div className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 place-items-center rounded-xl border font-heading text-sm"
                style={{ color: topic.accent, borderColor: `${topic.accent}55` }}
              >
                {topic.icon || "#"}
              </span>
              <div className="min-w-0">
                <h2 className="truncate font-heading text-base font-semibold">#{topic.name}</h2>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {topic.post_count || 0} gönderi
                </p>
              </div>
            </div>
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{topic.description}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--neon))]/70">
              <Lock className="h-3 w-3" /> şifreli alan
            </span>
          </Link>
        ))}
      </div>

      {topics.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-white/12 px-6 py-16 text-center text-sm text-muted-foreground">
          Henüz topluluk yok. İlkini oluştur.
        </div>
      )}
    </div>
  );
}