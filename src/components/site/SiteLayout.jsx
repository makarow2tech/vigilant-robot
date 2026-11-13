import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";

export default function SiteLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.55] grid-bg" />
      <div className="pointer-events-none fixed left-1/2 top-[-220px] z-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[hsl(var(--neon))]/10 blur-[140px] animate-pulse-glow" />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--neon))]/50 to-transparent" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 sm:px-6">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}