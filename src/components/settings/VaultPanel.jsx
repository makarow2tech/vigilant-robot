import { useEffect, useState } from "react";
import { KeyRound, Loader2, Lock, Unlock } from "lucide-react";
import { getSessionPrivateKey, lockVault } from "@/lib/vault";
import { useVaultVersion } from "@/lib/useVault";
import VaultDialog from "@/components/crypto/VaultDialog";
import { Button } from "@/components/ui/button";

export default function VaultPanel({ profile }) {
  const version = useVaultVersion();
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUnlocked(Boolean(getSessionPrivateKey()));
    setReady(true);
  }, [version]);

  const fingerprint = (() => {
    try {
      const jwk = JSON.parse(profile?.public_key || "{}");
      return jwk.n ? `${jwk.n.slice(0, 8)}…${jwk.n.slice(-8)}` : null;
    } catch {
      return null;
    }
  })();

  return (
    <div className="hud-flat p-5">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-[hsl(var(--neon))]" />
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-white">şifreleme kasası</h2>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        RSA-4096 anahtar çiftin tarayıcında üretilir. Özel anahtarın parolanla şifrelenmiş olarak saklanır;
        özel gönderilerini yalnızca sen okuyabilirsin.
      </p>

      <dl className="mt-4 space-y-2 font-mono text-[10px] uppercase tracking-[0.14em]">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">anahtar</dt>
          <dd className="truncate text-white/80">{fingerprint || "oluşturulmadı"}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">durum</dt>
          <dd className={unlocked ? "text-[hsl(var(--neon))]" : "text-white/60"}>
            {!ready ? "…" : unlocked ? "açık · oturum belleğinde" : "kilitli"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex gap-2">
        {fingerprint ? (
          unlocked ? (
            <Button
              size="sm"
              variant="outline"
              className="rounded-none border-[hsl(200_30%_18%)] font-mono text-[10px] uppercase tracking-[0.14em] hover:border-[hsl(var(--neon))]/50"
              onClick={() => {
                lockVault();
                setUnlocked(false);
              }}
            >
              <Lock className="mr-1.5 h-3.5 w-3.5" /> kilitle
            </Button>
          ) : (
            <Button
              size="sm"
              className="rounded-none bg-[hsl(var(--neon))] font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-black hover:bg-[hsl(var(--neon))]/85"
              onClick={() => setOpen(true)}
            >
              <Unlock className="mr-1.5 h-3.5 w-3.5" /> kilidi aç
            </Button>
          )
        ) : (
          <Button
            size="sm"
            className="rounded-none bg-[hsl(var(--neon))] font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-black hover:bg-[hsl(var(--neon))]/85"
            onClick={() => setOpen(true)}
          >
            <KeyRound className="mr-1.5 h-3.5 w-3.5" /> kasayı oluştur
          </Button>
        )}
        {!ready && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
      </div>

      <VaultDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}