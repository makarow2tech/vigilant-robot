import { Link, useNavigate } from "@tanstack/react-router";
import { Download, Lock, Menu, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { to: "/", label: "akış", exact: true },
  { to: "/topics", label: "topluluklar" },
  { to: "/submit", label: "yeni gönderi" },
];

export default function SiteHeader() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const search = (event) => {
    event.preventDefault();
    navigate({ to: "/", search: { q: query.trim() || undefined } });
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(200_40%_20%/0.7)] bg-[#05050a]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 place-items-center border border-[hsl(var(--neon))]/40 bg-[hsl(var(--neon))]/[0.06] chamfer">
            <span className="absolute inset-0 bg-[hsl(var(--neon))]/25 opacity-0 blur-md transition group-hover:opacity-100" />
            <Lock className="relative h-4 w-4 text-[hsl(var(--neon))]" strokeWidth={2.2} />
          </span>
          <span className="font-display text-lg font-bold uppercase tracking-[0.22em] text-white">
            KRYPT<span className="text-[hsl(var(--neon))]">_</span>
          </span>
        </Link>

        <nav className="ml-5 hidden items-center gap-0.5 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: Boolean(item.exact) }}
              className="group relative px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition hover:text-white"
              activeProps={{ className: "text-[hsl(var(--neon))]" }}
            >
              <span className="mr-1 text-[hsl(var(--neon))]/50 transition group-hover:text-[hsl(var(--neon))]">
                /
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <form onSubmit={search} className="relative hidden lg:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="grep -r ..."
              aria-label="Akışta ara"
              className="h-9 w-56 border border-[hsl(200_30%_18%)] bg-black/40 pl-8 pr-3 font-mono text-xs text-white/90 outline-none transition placeholder:text-muted-foreground/70 focus:border-[hsl(var(--neon))]/60 focus:shadow-[0_0_22px_-10px_hsl(var(--neon))]"
            />
          </form>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden h-9 rounded-none border border-[hsl(200_30%_18%)] font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:border-[hsl(var(--neon))]/40 hover:bg-white/[0.04] hover:text-white sm:flex"
          >
            <Link to="/source">
              <Download className="mr-1.5 h-3.5 w-3.5" /> protokol
            </Link>
          </Button>

          <Button
            asChild
            size="sm"
            className="h-9 rounded-none bg-[hsl(var(--neon))] font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-black hover:bg-[hsl(var(--neon))]/85"
          >
            <Link to="/submit">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> gönder
            </Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none border border-[hsl(200_30%_18%)] md:hidden">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 border-[hsl(200_40%_20%)] bg-[#06060b]">
              <div className="mt-8 flex flex-col gap-4">
                <form onSubmit={search} className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="grep -r ..."
                    aria-label="Akışta ara"
                    className="h-10 w-full border border-[hsl(200_30%_18%)] bg-black/40 pl-8 pr-3 font-mono text-xs outline-none focus:border-[hsl(var(--neon))]/60"
                  />
                </form>
                <div className="flex flex-col">
                  {NAV.concat([
                    { to: "/settings", label: "kasa" },
                    { to: "/source", label: "protokol" },
                  ]).map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="border-b border-white/[0.06] px-1 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-[hsl(var(--neon))]"
                    >
                      /{item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="overflow-hidden border-t border-[hsl(200_40%_18%/0.6)] bg-black/30">
        <div className="ticker-track font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground/70">
          {[0, 1].map((copy) => (
            <span key={copy} className="flex shrink-0 items-center gap-6 px-6 py-1.5">
              <span className="inline-flex items-center gap-1.5 text-[hsl(var(--neon))]/80">
                <span className="h-1 w-1 rounded-full bg-[hsl(var(--neon))] shadow-[0_0_8px_1px_hsl(var(--neon))]" />
                kanal güvenli
              </span>
              <span>aes-256-gcm aktif</span>
              <span>rsa-4096 anahtar sarma</span>
              <span>sunucuda düz metin %0</span>
              <span>çözme yalnızca tarayıcıda</span>
              <span className="text-[hsl(var(--neon-2))]/70">anonim kimlik · hesap yok</span>
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}