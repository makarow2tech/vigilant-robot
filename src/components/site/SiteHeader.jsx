import { Link } from "@tanstack/react-router";
import { Download, Lock, Menu, Plus, Search, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { to: "/", label: "Akış" },
  { to: "/topics", label: "Topluluklar" },
  { to: "/submit", label: "Yeni gönderi" },
];

export default function SiteHeader() {
  const { user, isAuthenticated, navigateToLogin, isLoadingAuth } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#06060a]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/[0.04]">
            <span className="absolute inset-0 rounded-xl bg-[hsl(var(--neon))]/20 blur-md opacity-70 transition group-hover:opacity-100" />
            <Lock className="relative h-4 w-4 text-[hsl(var(--neon))]" strokeWidth={2.2} />
          </span>
          <span className="font-heading text-lg font-semibold tracking-tight">
            KRYPT<span className="text-[hsl(var(--neon))]">.</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-white"
              activeProps={{ className: "text-white bg-white/[0.06]" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <form action="/" className="relative hidden lg:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              placeholder="Şifreli akışta ara…"
              className="h-9 w-56 rounded-xl border-white/10 bg-white/[0.03] pl-9 text-sm focus-visible:ring-[hsl(var(--neon))]/40"
            />
          </form>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden rounded-xl border border-white/10 text-xs text-muted-foreground hover:text-white sm:flex"
          >
            <Link to="/source">
              <Download className="mr-1.5 h-3.5 w-3.5" /> Kaynak .zip
            </Link>
          </Button>

          <Button
            asChild
            size="sm"
            className="rounded-xl bg-white text-black hover:bg-white/90"
          >
            <Link to="/submit">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Gönder
            </Link>
          </Button>

          {!isLoadingAuth && isAuthenticated ? (
            <Button asChild variant="ghost" size="sm" className="rounded-xl border border-white/10">
              <Link to="/settings">
                <User className="mr-1.5 h-3.5 w-3.5" />
                <span className="max-w-[90px] truncate">{user?.full_name || "Hesabım"}</span>
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigateToLogin()}
              className="rounded-xl border border-white/10 text-xs text-muted-foreground hover:text-white"
            >
              Giriş
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl md:hidden">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 border-white/10 bg-[#08080c]">
              <div className="mt-8 flex flex-col gap-1">
                {NAV.concat([{ to: "/source", label: "Kaynak .zip" }, { to: "/settings", label: "Ayarlar" }]).map(
                  (item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-white/5 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  )
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}