import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_site/admin")({
  head: () => ({ meta: [{ title: "KRYPT · yönetim" }] }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <div className="max-w-2xl pt-10">
      <span className="mono-label">yönetim</span>
      <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight">Yönetim paneli dahil değil</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Bağımsız pakette yönetim ekranları yok. İçerik yönetimi için <code>data/db.json</code> dosyasını
        düzenleyebilir veya kendi panelini ekleyebilirsin.
      </p>
      <Link to="/" className="mt-6 inline-block text-sm text-[hsl(var(--neon))]">
        Akışa dön
      </Link>
    </div>
  );
}