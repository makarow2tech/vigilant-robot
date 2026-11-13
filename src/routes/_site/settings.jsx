import { createFileRoute } from "@tanstack/react-router";
import VaultPanel from "@/components/settings/VaultPanel";

export const Route = createFileRoute("/_site/settings")({
  head: () => ({ meta: [{ title: "KRYPT · kasa" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="max-w-2xl pt-10">
      <span className="mono-label">şifreleme</span>
      <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight">Kasa</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Özel anahtarın yalnızca bu tarayıcıda, parolanla açılabilir halde tutulur. Kasa kilitliyken özel
        gönderileri okuyamazsın.
      </p>
      <div className="mt-6">
        <VaultPanel />
      </div>
      <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Bu bağımsız sürümde hesap sistemi yok; kasa bu tarayıcının anonim kimliğine bağlıdır.
      </p>
    </div>
  );
}