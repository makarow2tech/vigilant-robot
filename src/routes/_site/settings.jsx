import { createFileRoute, Link } from "@tanstack/react-router";
import { Fingerprint, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAnonId, useAnonName } from "@/lib/useAnon";
import { useVaultVersion } from "@/lib/useVault";
import { useDecryptedPosts } from "@/lib/useDecrypt";
import { useMyState } from "@/lib/useMyState";
import { getMyProfile, listBookmarks } from "@/lib/server-fns";
import VaultPanel from "@/components/settings/VaultPanel";
import PostCard from "@/components/forum/PostCard";

export const Route = createFileRoute("/_site/settings")({
  head: () => ({ meta: [{ title: "KRYPT · kasa ve kimlik" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const anonId = useAnonId();
  const handle = useAnonName();
  const vaultVersion = useVaultVersion();
  const [profile, setProfile] = useState(null);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!anonId) return;
    let alive = true;
    setLoading(true);
    Promise.all([
      getMyProfile({ data: { ownerKey: anonId } }),
      listBookmarks({ data: { voterKey: anonId } }),
    ])
      .then(([profileData, bookmarkData]) => {
        if (!alive) return;
        setProfile(profileData);
        setSaved(bookmarkData || []);
      })
      .catch(() => {
        if (alive) setSaved([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [anonId, vaultVersion]);

  const decoded = useDecryptedPosts(saved);
  const myState = useMyState(saved.map((post) => post.id));

  return (
    <div className="max-w-3xl pt-10">
      <span className="mono-label">/ kasa ve kimlik</span>
      <h1 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
        kasa<span className="text-[hsl(var(--neon))]">_</span>
      </h1>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        özel anahtarın yalnızca bu tarayıcıda, parolanla açılabilir halde tutulur. kasa kilitliyken özel gönderileri
        okuyamazsın.
      </p>

      <div className="mt-6 grid gap-4">
        <VaultPanel profile={profile} />

        <div className="hud-flat p-5">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-[hsl(var(--neon))]" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-white">anonim kimlik</h2>
          </div>
          <dl className="mt-4 space-y-2 font-mono text-[10px] uppercase tracking-[0.14em]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">görünen ad</dt>
              <dd className="text-white/80">{handle}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">kimlik</dt>
              <dd className="max-w-[60%] truncate text-white/60">{anonId || "…"}</dd>
            </div>
          </dl>
          <p className="mt-3 border-l-2 border-[hsl(var(--neon-2))]/40 pl-3 font-mono text-[9px] leading-relaxed text-muted-foreground/70">
            hesap sistemi yok. bu kimlik bu tarayıcıya bağlıdır; başka bir cihazda oyların ve özel gönderilerin
            görünmez.
          </p>
        </div>

        <div className="hud-flat p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-white">kaydedilenler</h2>
            <span className="mono-label">{saved.length} kayıt</span>
          </div>

          {loading ? (
            <div className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[hsl(var(--neon))]" /> yükleniyor…
            </div>
          ) : saved.length === 0 ? (
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] leading-relaxed text-muted-foreground">
              henüz gönderi kaydetmedin. akıştaki kaydet simgesine dokun.
            </p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {saved.map((post, index) => (
                <PostCard
                  key={post.id}
                  post={post}
                  decoded={decoded[post.id]}
                  index={index}
                  myVote={myState.votes[post.id] || 0}
                  saved
                  onDeleted={(id) => setSaved((prev) => prev.filter((item) => item.id !== id))}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 border border-[hsl(200_30%_18%)] bg-white/[0.02] px-4 py-3 font-mono text-[9px] leading-relaxed text-muted-foreground/70">
        kasa parolanı kaybedersen özel gönderilerini ve yorumlarını geri getiremezsin — sunucuda düz metin ya da
        kurtarma anahtarı tutulmaz.
      </p>

      <Link
        to="/"
        className="mt-6 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--neon))]"
      >
        ← akışa dön
      </Link>
    </div>
  );
}