import { useEffect, useState } from "react";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { createVault, unlockVault } from "@/lib/crypto";
import { setSessionPrivateKey } from "@/lib/vault";
import { getMyVault, saveMyVault } from "@/lib/server-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VaultDialog({ open, onOpenChange }) {
  const { user } = useAuth();
  const [mode, setMode] = useState(null);
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !user?.id) return;
    setError("");
    setPassphrase("");
    setConfirm("");
    setMode(null);
    getMyVault()
      .then((data) => setMode(data?.vault ? "unlock" : "create"))
      .catch(() => setMode("create"));
  }, [open, user?.id]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!user?.id) return;
    if (mode === "create" && passphrase !== confirm) {
      setError("Parolalar eşleşmiyor.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "create") {
        const { publicKeyJwk, privateKeyJwk, vault } = await createVault(passphrase);
        await saveMyVault({ public_key: JSON.stringify(publicKeyJwk), vault });
        setSessionPrivateKey(user.id, privateKeyJwk);
      } else {
        const data = await getMyVault();
        const privateKeyJwk = await unlockVault(data.vault, passphrase);
        setSessionPrivateKey(user.id, privateKeyJwk);
      }
      onOpenChange(false);
    } catch (caught) {
      setError(caught?.message || "Kasa açılamadı.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-white/10 bg-[#0a0a0f] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <KeyRound className="h-4 w-4 text-[hsl(var(--neon))]" />
            {mode === "create" ? "Kasayı oluştur" : "Kasayı aç"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {mode === "create"
              ? "RSA-4096 anahtar çiftin tarayıcında üretilir. Özel anahtar yalnızca bu parolayla şifrelenmiş olarak saklanır — parolayı kaybedersen özel gönderilerini geri getiremezsin."
              : "Özel anahtarını açmak için kasa parolanı gir. Anahtar yalnızca bu oturum boyunca bellekte kalır."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label className="mono-label">kasa parolası</Label>
            <Input
              type="password"
              autoComplete="off"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              placeholder="En az 8 karakter"
              className="rounded-xl border-white/10 bg-white/[0.04]"
            />
          </div>
          {mode === "create" && (
            <div className="space-y-2">
              <Label className="mono-label">parola (tekrar)</Label>
              <Input
                type="password"
                autoComplete="off"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="rounded-xl border-white/10 bg-white/[0.04]"
              />
            </div>
          )}
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
          <Button type="submit" disabled={busy || !passphrase} className="w-full rounded-xl bg-white text-black">
            {busy ? "Anahtar türetiliyor…" : mode === "create" ? "Kasayı oluştur" : "Kilidi aç"}
          </Button>
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-[hsl(var(--neon))]" /> PBKDF2-SHA256 · 310.000 iterasyon
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function VaultLockedChip({ label = "Özel içerik", onUnlock }) {
  return (
    <button
      type="button"
      onClick={onUnlock}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition hover:border-[hsl(var(--neon))]/40 hover:text-white"
    >
      <Lock className="h-3 w-3" /> {label}
    </button>
  );
}