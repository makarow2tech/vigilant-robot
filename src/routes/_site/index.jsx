import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Flame, KeyRound, Lock, Plus, Sparkles, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import PostCard from "@/components/forum/PostCard";
import { getSiteConfig, listFeed, listTopics } from "@/lib/server-fns";
import { useDecryptedPosts } from "@/lib/useDecrypt";

export const Route = createFileRoute("/_site/")({
  validateSearch: (search) => ({ sort: search.sort, topic: search.topic, q: search.q }),
  loaderDeps: ({ search }) => ({
    sort: ["hot", "new", "top"].includes(search.sort) ? search.sort : "hot",
    topic: search.topic || "",
  }),
  loader: async ({ deps }) => {
    const [configResult, topics, feed] = await Promise.all([
      getSiteConfig(),
      listTopics(),
      listFeed({ data: { sort: deps.sort, topicSlug: deps.topic || undefined, limit: 20 } }),
    ]);
    return { config: configResult.config, topics, feed };
  },
  head: () => ({
    meta: [
      { title: "KRYPT — Şifreli Tartışma Ağı" },
      { name: "description", content: "Uçtan uca şifreli gönderiler, anonim yorumlar ve neon topluluklar." },
    ],
  }),
  component: HomePage,
});

const SORTS = [
  { key: "hot", label: "Sıcak", icon: Flame },
  { key: "new", label: "Yeni", icon: Sparkles },
  { key: "top", label: "En iyi", icon: Zap },
];

function HomePage() {
  const { config, topics, feed } = Route.useLoaderData();
  const search = Route.useSearch();
  const sort = ["hot", "new", "top"].includes(search.sort) ? search.sort : "hot";
  const decoded = useDecryptedPosts(feed.items);
  const [query, setQuery] = useState(search.q || "");

  const posts = useMemo(() => {
    const list = feed.items || [];
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((post) => {
      const text = decoded[post.id];
      return (
        (text?.title || "").toLowerCase().includes(needle) ||
        (text?.body || "").toLowerCase().includes(needle) ||
        (post.author_name || "").toLowerCase().includes(needle) ||
        (post.topic_name || "").toLowerCase().includes(needle)
      );
    });
  }, [feed.items, query, decoded]);

  return (
    <div className="pt-8">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.02] px-5 py-12 sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[hsl(var(--neon-2))]/20 blur-[90px] animate-pulse-glow" />
        <div className="relative">
          <span className="mono-label inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--neon))] shadow-[0_0_10px_2px_hsl(var(--neon))]" />
            {config.site_name} · {config.tagline}
          </span>
          <h1 className="mt-5 max-w-3xl text-balance font-heading text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            {config.hero_title || "Tartışma burada şifrelenir."}
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
            {config.hero_subtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-xl bg-white text-black hover:bg-white/90">
              <Link to="/submit">
                <Plus className="mr-2 h-4 w-4" /> Şifreli gönderi oluştur
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl border-white/15 bg-white/[0.03] hover:bg-white/[0.07]">
              <Link to="/topics">
                Toplulukları keşfet <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Lock, label: "Şifreleme", value: "AES-256-GCM" },
              { icon: KeyRound, label: "Anahtar sarma", value: "RSA-4096" },
              { icon: Zap, label: "Sunucuda düz metin", value: "%0" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 backdrop-blur">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <Icon className="h-3 w-3 text-[hsl(var(--neon))]" /> {label}
                </div>
                <div className="mt-1.5 font-heading text-lg font-medium text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {config.announcement && (
        <div className="mt-6 rounded-2xl border border-[hsl(var(--neon))]/30 bg-[hsl(var(--neon))]/[0.06] px-4 py-3 text-sm text-white/80">
          {config.announcement}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <section>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
              {SORTS.map(({ key, label, icon: Icon }) => (
                <Link
                  key={key}
                  to="/"
                  search={{ sort: key, topic: search.topic }}
                  className={
                    sort === key
                      ? "inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-black"
                      : "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-white"
                  }
                >
                  <Icon className="h-3 w-3" /> {label}
                </Link>
              ))}
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Akışta filtrele…"
              className="h-9 min-w-[150px] flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm outline-none focus:border-[hsl(var(--neon))]/50"
            />
          </div>

          {search.topic && (
            <div className="mt-3 flex items-center gap-2">
              <span className="mono-label">filtre</span>
              <Link to="/" search={{ sort }} className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] text-white/70 hover:text-white">
                #{search.topic} ✕
              </Link>
            </div>
          )}

          <div className="mt-4 space-y-3">
            {posts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/12 px-6 py-14 text-center">
                <p className="font-heading text-base text-white/80">Burada henüz şifreli bir gönderi yok.</p>
                <Button asChild size="sm" className="mt-4 rounded-xl bg-white text-black">
                  <Link to="/submit">İlk gönderiyi oluştur</Link>
                </Button>
              </div>
            )}
            {posts.map((post, index) => (
              <PostCard key={post.id} post={post} decoded={decoded[post.id]} index={index} />
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="mono-label">topluluklar</h2>
            <ul className="mt-4 space-y-1">
              {topics.slice(0, 6).map((topic) => (
                <li key={topic.id}>
                  <Link
                    to="/t/$slug"
                    params={{ slug: topic.slug }}
                    className="flex items-center justify-between rounded-xl px-2 py-2 text-sm transition hover:bg-white/5"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: topic.accent, boxShadow: `0 0 8px ${topic.accent}` }}
                      />
                      <span className="text-white/85">#{topic.name}</span>
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">{topic.post_count || 0}</span>
                  </Link>
                </li>
              ))}
              {topics.length === 0 && (
                <li className="px-2 py-3 text-sm text-muted-foreground">
                  Henüz topluluk yok.{" "}
                  <Link to="/topics" className="text-[hsl(var(--neon))]">
                    Oluştur
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--neon))]/25 bg-gradient-to-b from-[hsl(var(--neon))]/10 to-transparent p-5">
            <Lock className="h-4 w-4 text-[hsl(var(--neon))]" />
            <h2 className="mt-3 font-heading text-base font-semibold">Nasıl şifreleniyor?</h2>
            <ol className="mt-3 space-y-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
              <li>01 · İçerik AES-256-GCM ile şifrelenir</li>
              <li>02 · Oturum anahtarı RSA-4096 ile sarılır</li>
              <li>03 · Sunucu yalnızca şifreli bloğu saklar</li>
              <li>04 · Çözme işlemi tarayıcında olur</li>
            </ol>
            <Link to="/source" className="mt-4 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--neon))]">
              kaynak kodu indir <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}