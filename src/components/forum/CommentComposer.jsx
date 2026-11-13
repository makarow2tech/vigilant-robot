import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { encryptText } from "@/lib/crypto";
import { getAnonIdentity } from "@/lib/anon";
import { anonSecretHash } from "@/lib/anon";
import { createComment } from "@/lib/server-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function CommentComposer({
  postId,
  visibility = "public",
  ownerPublicKey = null,
  parent = null,
  onCreated,
  onCancel,
  compact = false,
}) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(!user);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const isPrivate = visibility === "private";
      if (isPrivate && !ownerPublicKey) throw new Error("Özel gönderiye yorum için kasa anahtarı gerekli.");
      const encrypted = await encryptText(text.trim(), {
        visibility: isPrivate ? "private" : "public",
        ownerPublicKey,
      });
      const created = await createComment({
        data: {
          post_id: postId,
          parent_id: parent?.id || "",
          body_cipher: encrypted.cipher,
          envelopes: encrypted.envelopes,
          visibility: isPrivate ? "private" : "public",
          author_name: anonymous ? getAnonIdentity().name : user?.full_name || "kullanıcı",
          anon_secret_hash: anonymous ? await anonSecretHash() : "",
          anon_id: anonymous ? getAnonIdentity().id : "",
          depth: parent ? Math.min((parent.depth || 0) + 1, 10) : 0,
        },
      });
      setText("");
      onCreated?.(created);
      toast.success("Yorum şifrelenip eklendi");
    } catch (error) {
      toast.error(error?.message || "Yorum eklenemedi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={parent ? "Yanıtını yaz…" : "Şifrelenecek yorumunu yaz…"}
        className="min-h-[80px] rounded-xl border-white/10 bg-white/[0.03] text-sm"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submit(event);
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <input
            type="checkbox"
            checked={anonymous}
            disabled={!user}
            onChange={(event) => setAnonymous(event.target.checked)}
            className="h-3 w-3 accent-[hsl(var(--neon))]"
          />
          anonim
        </label>
        <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          AES-256-GCM
        </Label>
        <div className="ml-auto flex items-center gap-2">
          {onCancel && (
            <Button type="button" size="sm" variant="ghost" className="rounded-lg" onClick={onCancel}>
              Vazgeç
            </Button>
          )}
          <Button
            type="submit"
            size={compact ? "sm" : "default"}
            disabled={busy || !text.trim()}
            className="rounded-xl bg-white text-black hover:bg-white/90"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" /> {busy ? "Şifreleniyor…" : "Gönder"}
          </Button>
        </div>
      </div>
    </form>
  );
}