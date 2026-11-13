import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="relative border-t border-[hsl(200_40%_20%/0.7)] bg-black/40">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[hsl(var(--neon))]" />
              <span className="font-display text-base font-bold uppercase tracking-[0.22em] text-white">
                KRYPT<span className="text-[hsl(var(--neon))]">_</span>
              </span>
            </div>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted-foreground">
              AES-256-GCM ile şifrelenen, RSA-4096 anahtarlarla sarılan uçtan uca şifreli tartışma ağı.
              Sunucu yalnızca şifreli blokları saklar.
            </p>
          </div>

          <div>
            <h2 className="mono-label">navigasyon</h2>
            <ul className="mt-3 space-y-2 font-mono text-xs text-muted-foreground">
              <li><Link to="/" className="transition hover:text-[hsl(var(--neon))]">/ akış</Link></li>
              <li><Link to="/topics" className="transition hover:text-[hsl(var(--neon))]">/ topluluklar</Link></li>
              <li><Link to="/submit" className="transition hover:text-[hsl(var(--neon))]">/ yeni gönderi</Link></li>
              <li><Link to="/settings" className="transition hover:text-[hsl(var(--neon))]">/ kasa</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="mono-label">protokol</h2>
            <ul className="mt-3 space-y-2 font-mono text-xs text-muted-foreground">
              <li><Link to="/source" className="transition hover:text-[hsl(var(--neon))]">/ şifreleme akışı</Link></li>
              <li><a href="https://github.com/makarow2tech/vigilant-robot" target="_blank" rel="noreferrer" className="transition hover:text-[hsl(var(--neon))]">/ kaynak kod ↗</a></li>
              <li><span className="text-muted-foreground/60">aes-256-gcm</span></li>
              <li><span className="text-muted-foreground/60">rsa-oaep · sha-256</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-2 border-t border-white/[0.06] pt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <span>krypt // bağımsız sürüm · hesap sistemi yok</span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[hsl(var(--neon))] shadow-[0_0_8px_1px_hsl(var(--neon))]" />
            node durumu: çevrimiçi
          </span>
        </div>
      </div>
    </footer>
  );
}