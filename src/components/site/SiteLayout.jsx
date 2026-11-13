import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import ThemeBridge from "@/components/site/ThemeBridge";

export default function SiteLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <ThemeBridge />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] grid-bg opacity-70" />
      <div className="pointer-events-none absolute left-1/2 top-[-140px] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[hsl(var(--neon))]/10 blur-[120px]" />
      <div className="relative z-10">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}