import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Flame, Lock, MessageSquare, Sparkles, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSiteConfig, listFeed, listTopics } from "@/lib/server-fns";
import { useDecryptedPosts } from "@/lib/useDecrypt";
import { useMyState } from "@/lib/useMyState";
import Hero from "@/components/site/Hero";
import PostCard from "@/components/forum/PostCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_site/")({
  validateSearch: (search) => ({
    sort: search.sort || undefined,
    topic: search.topic || undefined,
    q: search.q || undefined,
  }),
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
      { name: "description", content: "Uçtan uca şifreli gönderiler, anonim yorumlar ve karanlık topluluklar." },
    ],
  }),
  component: HomePage,
});

const SORTS = [
  { key: "hot", label: "sıcak", icon: Flame },
  { key: "new", label: "yeni", icon: Sparkles },
  { key: "top", label: "en iyi", icon: Zap },
];

function HomePage() {
  const { config, topics, feed } = Route.useLoaderData();
  const search = Route.useSearch();
  const sort = ["hot", "new", "top"].includes(search.sort) ? search.sort : "hot";
  const [query, setQuery] = useState(search.q || "");
  const [extraPages, setExtraPages] = useState([]);
  const [cursor, setCursor] = useState(feed.next_cursor);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setQuery(search.q || "");
    setExtraPages([]);
    setCursor(feed.next_cursor);
  }, [search.q, feed]);

  const items = useMemo(
    () => [...(feed.items || []), ...extraPages.flatMap((page) => page.items || [])],
    [feed.items, extraPages]
  );

  const decoded = useDecryptedPosts(items);
  const myState = useMyState(items.map((post) => post.id));

  const posts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((post) => {
      const text = decoded[post.id];
      return (
        (text?.title || "").toLowerCase().includes(needle) ||
        (text?.body || "").toLowerCase().includes(needle) ||
        (post.author_name || "").toLowerCase().includes(needle) ||
        (post.topic_name || "").toLowerCase().includes(needle)
      );
    });
  }, [items, query, decoded]);

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const next = await listFeed({
        data: { sort, topicSlug: search.topic || undefined, limit: 20, cursor },
      });
      setExtraPages((prev) => [...prev, next]);
      setCursor(next.next_cursor);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="pb-6">
      <Hero config={config} />

      {config.announcement && (
        <div className="mt-4 flex items-start gap-2 border-l-2 border-[hsl(var(--neon))] bg-[hsl(var(--neon))]/[0.05] px-4 py-3 font-mono text-[11px] text-white/75">
          <span className="text-[hsl(var(--neon))]">[bilgi]</span>
          {config.announcement}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <section>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center border border-[hsl(200_30%_18%)] bg-black/30 p-0.5">
              {SORTS.map(({ key, label, icon: Icon }) => (
                <Link
                  key={key}
                  to="/"
                  search={{ sort: key, topic: search.topic, q: search.q }}
                  className={
                    sort === key
                      ? "inline-flex items-center gap-1.5 bg-[hsl(var(--neon))] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-black"
                      : "inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition hover:text-white"
                  }
                >
                  <Icon className="h-3 w-3" /> {label}
                </Link>
              ))}
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="akışta filtrele…"
              aria-label="Akışta filtrele"
              className="h-9 min-w-[150px] flex-1 border border-[hsl(200_30%_18%)] bg-black/30 px-3 font-mono text-xs outline-none transition placeholder:text-muted-foreground/70 focus:border-[hsl(var(--neon))]/60"
            />
          </div>

          {search.topic && (
            <div className="mt-3 flex items-center gap-2">
              <span className="mono-label">filtre</span>
              <Link
                to="/"
                search={{ sort, q: search.q }}
                className="border border-[hsl(var(--neon))]/40 px-2 py-0.5 font-mono text-[10px] text-[hsl(var(--neon))]"
              >
                #{search.topic} ✕
              </Link>
            </div>
          )}

          <div className="mt-4 space-y-2.5">
            {posts.length === 0 && (
              <div className="border border-dashed border-[hsl(200_30%_20%)] px-6 py-14 text-center">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {query ? "eşleşen şifreli gönderi yok" : "burada henüz şifreli bir gönderi yok"}
                </p>
                <Button
                  asChild
                  size="sm"
                  className="mt-4 rounded-none bg-[hsl(var(--neon))] font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-black hover:bg-[hsl(var(--neon))]/85"
                >
                  <Link to="/submit">ilk gönderiyi oluştur</Link>
                </Button>
              </div>
            )}

            {posts.map((post, index) => (
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

          {cursor && (
            <div className="mt-5 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-none border-[hsl(200_30%_18%)] font-mono text-[10px] uppercase tracking-[0.18em] hover:border-[hsl(var(--neon))]/50"
              >
                {loadingMore ? "yükleniyor…" : "daha fazla yükle"}
              </Button>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="hud-flat p-5">
            <h2 className="mono-label">topluluklar</h2>
            <ul className="mt-4 space-y-0.5">
              {topics.slice(0, 7).map((topic) => (
                <li key={topic.id}>
                  <Link
                    to="/t/$slug"
                    params={{ slug: topic.slug }}
                    className="flex items-center justify-between px-1 py-2 font-mono text-xs transition hover:text-white"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 shrink-0"
                        style={{ background: topic.accent, boxShadow: `0 0 8px ${topic.accent}` }}
                      />
                      <span className="truncate text-white/80">#{topic.name}</span>
                    </span>
                    <span className="text-muted-foreground">{topic.post_count || 0}</span>
                  </Link>
                </li>
              ))}
              {topics.length === 0 && (
                <li className="px-1 py-3 font-mono text-[11px] text-muted-foreground">
                  henüz topluluk yok.{" "}
                  <Link to="/topics" className="text-[hsl(var(--neon))]">
                    oluştur
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <div className="hud border-[hsl(var(--neon))]/25 p-5">
            <Lock className="h-4 w-4 text-[hsl(var(--neon))]" />
            <h2 className="mt-3 font-display text-sm font-semibold uppercase tracking-[0.1em] text-white">
              nasıl şifreleniyor?
            </h2>
            <ol className="mt-3 space-y-2.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
              <li><span className="text-[hsl(var(--neon))]">01</span> · içerik AES-256-GCM ile şifrelenir</li>
              <li><span className="text-[hsl(var(--neon))]">02</span> · oturum anahtarı RSA-4096 ile sarılır</li>
              <li><span className="text-[hsl(var(--neon))]">03</span> · sunucu yalnızca şifreli bloğu saklar</li>
              <li><span className="text-[hsl(var(--neon))]">04</span> · çözme işlemi tarayıcında olur</li>
            </ol>
            <Link
              to="/source"
              className="mt-4 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[hsl(var(--neon))]"
            >
              protokolü oku <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="hud-flat p-5">
            <h2 className="mono-label">oturum</h2>
            <p className="mt-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
              hesap yok. kimliğin bu tarayıcıda üretilir; oylar, silme yetkisi ve kasan bu kimliğe bağlıdır.
            </p>
            <Link
              to="/settings"
              className="mt-3 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-white/70 transition hover:text-[hsl(var(--neon))]"
            >
              kasayı yönet <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </aside>
      </div>

      <div className="mt-10 flex items-center justify-center gap-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/50">
        <MessageSquare className="h-3 w-3" />
        <span>tüm içerik istemcide şifrelenir</span>
      </div>
    </div>
  );
}