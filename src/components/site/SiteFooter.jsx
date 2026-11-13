import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 font-heading text-base font-semibold">
            <Lock className="h-4 w-4 text-[hsl(var(--neon))]" />
            KRYPT<span className="text-[hsl(var(--neon))]">.</span>
          </div>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            AES-256-GCM ile şifrelenen, RSA-4096 anahtarlarla sarılan uçtan uca şifreli tartışma ağı.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <Link to="/topics" className="transition hover:text-white">Topluluklar</Link>
          <Link to="/source" className="transition hover:text-white">Kaynak kod</Link>
          <Link to="/admin" className="transition hover:text-white">Yönetim</Link>
          <span className="text-white/20">AES-256 · RSA-4096</span>
        </div>
      </div>
    </footer>
  );
}