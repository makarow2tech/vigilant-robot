import { Link } from "@tanstack/react-router";
import { ArrowRight, Fingerprint, KeyRound, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const CIPHER_LINES = [
  "a3f1 9c02 77b4 e1d8  5a6f 0b39 82cd 4e11",
  "0d7a 3f45 b19c 6e20  c84f 12ab 9d3e 7f60",
  "5b2e 8d11 c740 93fa  61b0 ee24 3c9d a8f7",
  "9e6c 04b8 21df 7a35  d0c9 4b71 8e2a 55bf",
];

const STATS = [
  { icon: Lock, label: "şifreleme", value: "AES-256-GCM" },
  { icon: KeyRound, label: "anahtar sarma", value: "RSA-4096" },
  { icon: Fingerprint, label: "sunucuda düz metin", value: "%0" },
];

export default function Hero({ config = {} }) {
  const title = config.hero_title || "Tartışma burada şifrelenir.";
  const subtitle =
    config.hero_subtitle ||
    "Gönderiler tarayıcında şifrelenir, anahtarınla sarılır. Sunucu yalnızca şifreli blokları saklar — düz metni hiç görmez.";

  return (
    <section className="relative mt-6 overflow-hidden hud scanlines">
      <div className="flex items-center justify-between gap-3 border-b border-[hsl(200_40%_20%/0.7)] bg-black/40 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--neon-2))]/80" />
          <span className="h-2 w-2 rounded-full bg-[hsl(45_100%_60%)]/70" />
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--neon))]/80" />
          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            krypt@node:~/feed
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.24em] text-[hsl(var(--neon))]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[hsl(var(--neon))] shadow-[0_0_10px_2px_hsl(var(--neon))]" />
          secure
        </span>
      </div>

      <div className="relative grid gap-10 px-5 py-11 sm:px-9 sm:py-14 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 border border-[hsl(var(--neon))]/30 bg-[hsl(var(--neon))]/[0.07] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--neon))]">
            <span className="h-1 w-1 bg-[hsl(var(--neon))]" />
            {config.site_name || "KRYPT"} // {config.tagline || "şifreli tartışma ağı"}
          </span>

          <h1 className="mt-5 max-w-[19ch] text-balance font-display text-4xl font-bold uppercase leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-[3.6rem]">
            <span className="neon-text cursor">{title}</span>
          </h1>

          <p className="mt-5 max-w-xl text-pretty text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
            {subtitle}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild className="h-11 rounded-none bg-[hsl(var(--neon))] px-5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-black hover:bg-[hsl(var(--neon))]/85">
              <Link to="/submit">
                <Plus className="mr-2 h-4 w-4" /> şifreli gönderi oluştur
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-none border-[hsl(var(--neon))]/35 bg-white/[0.02] px-5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/90 hover:border-[hsl(var(--neon))]/70 hover:bg-white/[0.05]"
            >
              <Link to="/topics">
                toplulukları keşfet <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-9 grid gap-2 sm:grid-cols-3">
            {STATS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="hud-flat px-3 py-3">
                <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  <Icon className="h-3 w-3 text-[hsl(var(--neon))]" /> {label}
                </div>
                <div className="mt-1.5 font-mono text-[13px] font-medium text-white/90">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* cipher preview — terminal panel */}
        <div className="relative" aria-hidden="true">
          <div className="hud-flat relative overflow-hidden p-4">
            <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>cipher.stream</span>
              <span className="text-[hsl(var(--neon))]/80">encrypted</span>
            </div>
            <div className="mt-4 space-y-2 font-mono text-[10px] leading-relaxed text-[hsl(var(--neon-3))]/70 sm:text-[11px]">
              {CIPHER_LINES.map((line, index) => (
                <div key={line} className="flex gap-2">
                  <span className="text-white/20">{String(index + 1).padStart(2, "0")}</span>
                  <span className="truncate">{line}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 h-1 w-full overflow-hidden bg-white/[0.06]">
              <div className="h-full w-4/5 bg-gradient-to-r from-[hsl(var(--neon))] via-[hsl(var(--neon-3))] to-[hsl(var(--neon-2))]" />
            </div>
            <div className="mt-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>rsa-oaep · sha-256</span>
              <span className="text-[hsl(var(--neon-2))]">key wrapped</span>
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 animate-scan bg-gradient-to-b from-transparent via-[hsl(var(--neon))]/10 to-transparent" />
          </div>
          <p className="mt-2 text-right font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50">
            yalnızca şifreli blok · çözme istemcide
          </p>
        </div>
      </div>
    </section>
  );
}