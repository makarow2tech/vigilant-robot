import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Fingerprint, KeyRound, Lock, Server, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_site/source")({
  head: () => ({
    meta: [
      { title: "KRYPT · şifreleme protokolü" },
      { name: "description", content: "KRYPT'in uçtan uca şifreleme akışı: AES-256-GCM, RSA-OAEP ve PBKDF2 kasası." },
    ],
  }),
  component: SourcePage,
});

const STEPS = [
  {
    icon: KeyRound,
    title: "01 · içerik anahtarı",
    body: "her gönderi ve yorum için rastgele 256 bit AES anahtarı üretilir. başlık ve gövde ayrı IV'lerle AES-256-GCM ile şifrelenir.",
  },
  {
    icon: Lock,
    title: "02 · anahtar sarma",
    body: "içerik anahtarı RSA-OAEP (SHA-256, 4096 bit) ile sarılır. herkese açık içerikte topluluk anahtarı, özel içerikte yazarın açık anahtarı kullanılır.",
  },
  {
    icon: Server,
    title: "03 · aktarım",
    body: "sunucuya yalnızca {iv, ct} bloğu ve zarf(lar) gider. düz metin hiçbir koşulda sunucuya ulaşmaz.",
  },
  {
    icon: Fingerprint,
    title: "04 · çözme",
    body: "çözme tarayıcıda yapılır. özel anahtar paroladan PBKDF2-SHA256 (310.000 iterasyon) ile türetilen anahtarla şifreli saklanır ve kasa kilitlenince silinir.",
  },
];

const SPECS = [
  ["simetrik şifreleme", "AES-256-GCM"],
  ["anahtar sarma", "RSA-OAEP · SHA-256 · 4096 bit"],
  ["kasa anahtarı", "PBKDF2-SHA256 · 310.000 iterasyon"],
  ["topluluk anahtarı", "PBKDF2 · 100.000 iterasyon · istemcide türetilir"],
  ["sunucuda düz metin", "%0"],
];

export default function SourcePage() {
  return (
    <div className="max-w-3xl pt-10">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition hover:text-white"
      >
        <ArrowLeft className="h-3 w-3" /> akış
      </Link>

      <span className="mono-label mt-6 block">/ protokol</span>
      <h1 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
        şifreleme akışı<span className="text-[hsl(var(--neon))]">_</span>
      </h1>
      <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground">
        KRYPT bağımsız sürümü. içerik tarayıcıda şifrelenir, anahtarlar zarflanır ve sunucu yalnızca şifreli blokları
        saklar. aşağıdaki akış her gönderi ve yorum için ayrı ayrı işler.
      </p>

      <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
        {STEPS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="hud-flat p-5">
            <Icon className="h-4 w-4 text-[hsl(var(--neon))]" />
            <h2 className="mt-3 font-display text-sm font-semibold uppercase tracking-[0.08em] text-white">{title}</h2>
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 hud p-5">
        <h2 className="mono-label">teknik künye</h2>
        <dl className="mt-3 divide-y divide-white/[0.06]">
          {SPECS.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-2">
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
              <dd className="text-right font-mono text-[10px] text-[hsl(var(--neon))]/85">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-6 hud-flat p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[hsl(var(--neon))]" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.08em] text-white">sınırlar</h2>
        </div>
        <ul className="mt-3 space-y-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          <li>· hesap yok: kimlik tarayıcıda üretilir, cihaz değişince geçmiş erişimler görünmez.</li>
          <li>· ek dosyalar şifrelenmez (görselin herkese açık olması gerekir).</li>
          <li>· herkese açık gönderilerin anahtarı topluluk parolasından türetilir; bu bir gizlilik değil, bütünlük katmanıdır.</li>
          <li>· özel gönderiler yalnızca yazarın kasa anahtarıyla açılır; parola kaybı geri dönüşsüzdür.</li>
        </ul>
      </div>

      <a
        href="https://github.com/makarow2tech/vigilant-robot"
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex items-center gap-2 border border-[hsl(var(--neon))]/35 bg-[hsl(var(--neon))]/[0.06] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--neon))] transition hover:border-[hsl(var(--neon))]/70"
      >
        kaynak kod · github <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}