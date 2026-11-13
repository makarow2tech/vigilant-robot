import { useEffect, useState } from "react";
import { KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";
import { createVault, unlockVault } from "@/lib/crypto";
import { setSessionPrivateKey } from "@/lib/vault";
import { useAnonId } from "@/lib/useAnon";
import { getMyVault, saveMyVault } from "@/lib/server-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function VaultDialog({ open, onOpenChange }) {
  const anonId = useAnonId();
  const [mode, setMode] = useState("loading");
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setPassphrase("");
    setConfirm("");
    if (!anonId) return;
    setMode("loading");
    getMyVault({ data: { ownerKey: anonId } })
      .then((data) => setMode(data?.vault ? "unlock" : "create"))
      .catch(() => setMode("create"));
  }, [open, anonId]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!anonId) {
      setError("Tarayıcı kimliği oluşturulamadı, sayfayı yenileyin.");
      return;
    }
    if (mode === "create" && passphrase !== confirm) {
      setError("Parolalar eşleşmiyor.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "create") {
        const { publicKeyJwk, privateKeyJwk, vault } = await createVault(passphrase);
        await saveMyVault({
          data: { owner_key: anonId, public_key: JSON.stringify(publicKeyJwk), vault },
        });
        setSessionPrivateKey(privateKeyJwk);
      } else {
        const data = await getMyVault({ data: { ownerKey: anonId } });
        if (!data?.vault) throw new Error("Kasa bulunamadı.");
        const privateKeyJwk = await unlockVault(data.vault, passphrase);
        setSessionPrivateKey(privateKeyJwk);
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
      <DialogContent className="rounded-none border-[hsl(200_40%_20%)] bg-[#07070c] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-base uppercase tracking-[0.08em]">
            <KeyRound className="h-4 w-4 text-[hsl(var(--neon))]" />
            {mode === "unlock" ? "kasayı aç" : "kasayı oluştur"}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
            {mode === "unlock"
              ? "Özel anahtarını açmak için kasa parolanı gir. Anahtar yalnızca bu oturum boyunca tarayıcı belleğinde kalır."
              : "RSA-4096 anahtar çifti tarayıcında üretilir. Özel anahtar yalnızca bu parolayla şifrelenmiş olarak saklanır — parolayı kaybedersen özel gönderilerini geri getiremezsin."}
          </DialogDescription>
        </DialogHeader>

        {mode === "loading" ? (
          <div className="flex items-center gap-2 py-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[hsl(var(--neon))]" /> kasa okunuyor…
          </div>
        ) : (
          <form onSubmit={submit} className="mt-2 space-y-4">
            <div className="space-y-2">
              <label className="mono-label" htmlFor="vault-pass">
                kasa parolası
              </label>
              <input
                id="vault-pass"
                type="password"
                autoComplete="off"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                placeholder="en az 8 karakter"
                className="h-10 w-full border border-[hsl(200_30%_18%)] bg-black/40 px-3 font-mono text-sm text-white outline-none transition focus:border-[hsl(var(--neon))]/60"
              />
            </div>
            {mode === "create" && (
              <div className="space-y-2">
                <label className="mono-label" htmlFor="vault-pass-2">
                  parola (tekrar)
                </label>
                <input
                  id="vault-pass-2"
                  type="password"
                  autoComplete="off"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="h-10 w-full border border-[hsl(200_30%_18%)] bg-black/40 px-3 font-mono text-sm text-white outline-none transition focus:border-[hsl(var(--neon))]/60"
                />
              </div>
            )}
            {error && (
              <p className="border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-[11px] text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={busy || !passphrase || (mode === "create" && !confirm)}
              className="w-full rounded-none bg-[hsl(var(--neon))] font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-black hover:bg-[hsl(var(--neon))]/85"
            >
              {busy ? "anahtar türetiliyor…" : mode === "create" ? "kasayı oluştur" : "kilidi aç"}
            </Button>
            <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">
              <ShieldCheck className="h-3 w-3 text-[hsl(var(--neon))]" /> pbkdf2-sha256 · 310.000 iterasyon
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function VaultLockedChip({ label = "özel içerik", onUnlock }) {
  return (
    <button
      type="button"
      onClick={onUnlock}
      className="inline-flex items-center gap-1.5 border border-white/15 bg-white/[0.04] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground transition hover:border-[hsl(var(--neon))]/50 hover:text-white"
    >
      <Lock className="h-3 w-3" /> {label}
      {onUnlock && <span className="text-[hsl(var(--neon))]">· aç</span>}
    </button>
  );
}