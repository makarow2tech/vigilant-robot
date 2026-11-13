import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { encryptText } from "@/lib/crypto";
import { anonSecretHash, getAnonIdentity } from "@/lib/anon";
import { useAnonName } from "@/lib/useAnon";
import { createComment } from "@/lib/server-fns";
import { Button } from "@/components/ui/button";

export default function CommentComposer({
  postId,
  visibility = "public",
  ownerPublicKey = null,
  parent = null,
  onCreated,
  onCancel,
  compact = false,
}) {
  const handle = useAnonName();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!text.trim() || busy) return;
    const isPrivate = visibility === "private";
    if (isPrivate && !ownerPublicKey) {
      toast.error("Özel gönderiye yorum için kasa açık olmalı.");
      return;
    }
    setBusy(true);
    try {
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
          depth: parent ? Math.min((parent.depth || 0) + 1, 10) : 0,
          author_name: getAnonIdentity().name,
          anon_id: getAnonIdentity().id,
          anon_secret_hash: await anonSecretHash(),
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
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={parent ? "yanıtını yaz…" : "şifrelenecek yorumunu yaz…"}
        className="min-h-[84px] w-full resize-y border border-[hsl(200_30%_18%)] bg-black/40 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-white/90 outline-none transition placeholder:text-muted-foreground/60 focus:border-[hsl(var(--neon))]/60"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submit(event);
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="h-1 w-1 bg-[hsl(var(--neon))]" /> {handle}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/60">
          aes-256-gcm · istemcide şifrelenir
        </span>
        <div className="ml-auto flex items-center gap-2">
          {onCancel && (
            <Button type="button" size="sm" variant="ghost" className="rounded-none font-mono text-[10px] uppercase" onClick={onCancel}>
              vazgeç
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={busy || !text.trim()}
            className="rounded-none bg-[hsl(var(--neon))] font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-black hover:bg-[hsl(var(--neon))]/85"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" /> {busy ? "şifreleniyor…" : "gönder"}
          </Button>
        </div>
      </div>
    </form>
  );
}