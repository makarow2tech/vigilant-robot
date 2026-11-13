import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_site/login")({
  head: () => ({ meta: [{ title: "KRYPT · giriş" }] }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="max-w-2xl pt-10">
      <span className="mono-label">kimlik</span>
      <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight">Hesaplar kapalı</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Bu bağımsız sürümde hesap sistemi yoktur. Herkes bu tarayıcıya özel anonim kimlikle yazar; gönderilerini
        aynı tarayıcıdan silebilirsin.
      </p>
      <Link to="/" className="mt-6 inline-block text-sm text-[hsl(var(--neon))]">
        Akışa dön
      </Link>
    </div>
  );
}