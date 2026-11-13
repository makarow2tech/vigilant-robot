import { createFileRoute } from "@tanstack/react-router";
import { FileCode2, KeyRound, Layers, Server } from "lucide-react";

export const Route = createFileRoute("/_site/source")({
  head: () => ({ meta: [{ title: "KRYPT · kaynak kod" }] }),
  component: SourcePage,
});

const ITEMS = [
  {
    icon: KeyRound,
    title: "kripto çekirdeği",
    text: "src/lib/crypto.js — AES-256-GCM + RSA-OAEP-4096 zarf motoru ve kasa yönetimi.",
  },
  {
    icon: Layers,
    title: "arayüz",
    text: "src/routes ve src/components — akış, gönderi, topluluk ve gönderi yazma ekranları.",
  },
  {
    icon: Server,
    title: "sunucu",
    text: "server/index.mjs — bağımlılıksız Node API, JSON dosya deposu ve dosya yükleme.",
  },
];

function SourcePage() {
  return (
    <div className="pt-10">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.02] px-5 py-12 sm:px-10">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
        <div className="relative max-w-2xl">
          <span className="mono-label">kendi sunucunda</span>
          <h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
            Kaynak kod <span className="text-gradient">bu paketin içinde</span>.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Bu sürüm platformdan bağımsız çalışır: proje klasörünün tamamı sende. Gönderiler, yorumlar ve
            topluluklar dahil değildir — boş bir veritabanıyla açılır, içeriği sen üretirsin.
          </p>
          <pre className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-white/70">
{`npm install
npm run api    # API :8787
npm run dev    # arayüz :5173`}
          </pre>
        </div>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {ITEMS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <Icon className="h-4 w-4 text-[hsl(var(--neon))]" />
            <h2 className="mt-3 font-heading text-base font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <FileCode2 className="mr-1.5 inline h-3 w-3" />
        Dağıtım adımları README.md içinde: tek servis (Render, Railway, Fly.io, VPS, Docker) veya statik arayüz +
        ayrı API (Vercel, Netlify, Cloudflare Pages).
      </p>
    </div>
  );
}