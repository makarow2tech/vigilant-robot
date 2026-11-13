import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getSessionPrivateKey, lockVault } from "@/lib/vault";
import { useVaultVersion } from "@/lib/useVault";
import VaultDialog from "@/components/crypto/VaultDialog";
import { Button } from "@/components/ui/button";
import { KeyRound, Lock, Unlock } from "lucide-react";

export default function VaultPanel({ profile }) {
  const { user } = useAuth();
  const version = useVaultVersion();
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setUnlocked(Boolean(user?.id && getSessionPrivateKey(user.id)));
  }, [user?.id, version]);

  const fingerprint = (() => {
    try {
      const jwk = JSON.parse(profile?.public_key || "{}");
      return jwk.n ? `${jwk.n.slice(0, 8)}…${jwk.n.slice(-8)}` : null;
    } catch {
      return null;
    }
  })();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-[hsl(var(--neon))]" />
        <h2 className="font-heading text-base font-semibold">Şifreleme kasası</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        RSA-4096 anahtar çiftin tarayıcında üretilir. Özel anahtarın parolanla şifrelenmiş olarak saklanır;
        özel gönderilerini yalnızca sen okuyabilirsin.
      </p>

      <dl className="mt-4 space-y-2 font-mono text-[11px]">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">anahtar</dt>
          <dd className="text-white/80">{profile?.public_key ? fingerprint : "oluşturulmadı"}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">durum</dt>
          <dd className={unlocked ? "text-[hsl(var(--neon))]" : "text-white/60"}>
            {unlocked ? "açık · oturum belleğinde" : "kilitli"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex gap-2">
        {profile?.public_key ? (
          unlocked ? (
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl border-white/15"
              onClick={() => {
                lockVault(user.id);
                setUnlocked(false);
              }}
            >
              <Lock className="mr-1.5 h-3.5 w-3.5" /> Kilitle
            </Button>
          ) : (
            <Button size="sm" className="rounded-xl bg-white text-black" onClick={() => setOpen(true)}>
              <Unlock className="mr-1.5 h-3.5 w-3.5" /> Kilidi aç
            </Button>
          )
        ) : (
          <Button size="sm" className="rounded-xl bg-white text-black" onClick={() => setOpen(true)}>
            Kasayı oluştur
          </Button>
        )}
      </div>

      <VaultDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}