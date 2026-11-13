import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, ImagePlus, KeyRound, Loader2, LockKeyhole, Send, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { encryptFields } from "@/lib/crypto";
import { anonSecretHash, getAnonIdentity } from "@/lib/anon";
import { useAnonId, useAnonName } from "@/lib/useAnon";
import { useVaultVersion } from "@/lib/useVault";
import { createPost, getMyProfile, getSiteConfig, listTopics } from "@/lib/server-fns";
import VaultDialog from "@/components/crypto/VaultDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_site/submit")({
  loader: async () => {
    const [configResult, topics] = await Promise.all([getSiteConfig(), listTopics()]);
    return { config: configResult.config, topics };
  },
  head: () => ({ meta: [{ title: "KRYPT · yeni şifreli gönderi" }] }),
  component: SubmitPage,
});

function SubmitPage() {
  const { config, topics } = Route.useLoaderData();
  const navigate = useNavigate();
  const anonId = useAnonId();
  const handle = useAnonName();
  const vaultVersion = useVaultVersion();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topicId, setTopicId] = useState(topics?.[0]?.id || "");
  const [flair, setFlair] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [publicKey, setPublicKey] = useState("");

  useEffect(() => {
    if (!anonId) return;
    getMyProfile({ data: { ownerKey: anonId } })
      .then((profile) => setPublicKey(profile?.public_key || ""))
      .catch(() => setPublicKey(""));
  }, [anonId, vaultVersion]);

  const selectedTopic = (topics || []).find((topic) => topic.id === topicId);
  const maxLength = config.max_post_length || 20000;

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!title.trim() || !body.trim()) {
      toast.error("Başlık ve içerik gerekli.");
      return;
    }
    if (body.length > maxLength) {
      toast.error(`İçerik en fazla ${maxLength} karakter olabilir.`);
      return;
    }
    if (visibility === "private" && !publicKey) {
      toast.error("Özel gönderi için önce kasanı oluştur.");
      setVaultOpen(true);
      return;
    }

    setBusy(true);
    try {
      let attachment = { attachment_url: "", attachment_name: "", attachment_type: "" };
      if (file && config.allow_attachments) {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
        attachment = { attachment_url: file_url, attachment_name: file.name, attachment_type: file.type };
      }

      const encrypted = await encryptFields(
        { title: title.trim(), body: body.trim() },
        { visibility, ownerPublicKey: visibility === "private" ? publicKey : null }
      );

      const identity = getAnonIdentity();
      const created = await createPost({
        data: {
          title_cipher: encrypted.ciphers.title,
          body_cipher: encrypted.ciphers.body,
          envelopes: encrypted.envelopes,
          visibility,
          owner_public_key: visibility === "private" ? publicKey : undefined,
          topic_id: selectedTopic?.id || "",
          topic_slug: selectedTopic?.slug || "",
          topic_name: selectedTopic?.name || "",
          flair: flair.trim().toUpperCase(),
          ...attachment,
          anon_id: identity.id,
          author_name: identity.name,
          anon_secret_hash: await anonSecretHash(),
        },
      });

      toast.success("Gönderi istemci tarafında şifrelendi");
      navigate({ to: "/p/$postId", params: { postId: created.id } });
    } catch (error) {
      toast.error(error?.message || "Gönderi oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mono-label">/ yeni gönderi</span>
          <h1 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
            şifreli gönderi<span className="text-[hsl(var(--neon))]">_</span>
          </h1>
          <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
            başlık ve gövde tarayıcında şifrelenir. sunucuya yalnızca AES-256-GCM şifreli blok ve RSA-4096 zarfları gider.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 border border-[hsl(var(--neon))]/30 bg-[hsl(var(--neon))]/10 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[hsl(var(--neon))]">
          <ShieldCheck className="h-3 w-3" /> uçtan uca şifreli
        </span>
      </div>

      <form onSubmit={submit} className="mt-8 grid gap-5 lg:grid-cols-[1fr_310px]">
        <div className="space-y-4 border border-[hsl(200_30%_18%)] bg-white/[0.02] p-5">
          <div className="space-y-2">
            <label className="mono-label" htmlFor="post-title">başlık</label>
            <input
              id="post-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="şifrelenecek başlık…"
              className="h-10 w-full border border-[hsl(200_30%_18%)] bg-black/40 px-3 font-mono text-sm text-white outline-none transition placeholder:text-muted-foreground/60 focus:border-[hsl(var(--neon))]/60"
            />
          </div>
          <div className="space-y-2">
            <label className="mono-label" htmlFor="post-body">içerik</label>
            <textarea
              id="post-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="markdown desteklenmez; düz metin şifrelenir."
              className="min-h-[280px] w-full resize-y border border-[hsl(200_30%_18%)] bg-black/40 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-white/90 outline-none transition placeholder:text-muted-foreground/60 focus:border-[hsl(var(--neon))]/60"
            />
            <p className="text-right font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              {body.length}/{maxLength}
            </p>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="hud-flat p-5">
            <h2 className="mono-label">görünürlük</h2>
            <div className="mt-3 grid gap-2">
              {[
                { key: "public", label: "herkese açık", hint: "topluluk anahtarıyla herkes okuyabilir", icon: Eye },
                { key: "private", label: "özel", hint: "yalnızca senin anahtarın çözer", icon: LockKeyhole },
              ].map(({ key, label, hint, icon: Icon }) => {
                const disabled = key === "private" && !config.allow_private_posts;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => setVisibility(key)}
                    className={cn(
                      "border p-3 text-left transition disabled:opacity-40",
                      visibility === key
                        ? "border-[hsl(var(--neon))]/50 bg-[hsl(var(--neon))]/10"
                        : "border-[hsl(200_30%_18%)] bg-white/[0.02] hover:border-white/25"
                    )}
                  >
                    <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white">
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </span>
                    <span className="mt-1 block font-mono text-[9px] text-muted-foreground">{hint}</span>
                  </button>
                );
              })}
            </div>
            {visibility === "private" && !publicKey && (
              <Button
                type="button"
                size="sm"
                onClick={() => setVaultOpen(true)}
                className="mt-3 w-full rounded-none bg-[hsl(var(--neon))] font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-black hover:bg-[hsl(var(--neon))]/85"
              >
                <KeyRound className="mr-1.5 h-3.5 w-3.5" /> kasayı oluştur
              </Button>
            )}
          </div>

          <div className="space-y-3 hud-flat p-5">
            <div className="space-y-2">
              <label className="mono-label" htmlFor="post-topic">topluluk</label>
              <select
                id="post-topic"
                value={topicId}
                onChange={(event) => setTopicId(event.target.value)}
                className="h-9 w-full border border-[hsl(200_30%_18%)] bg-[#07070c] px-2 font-mono text-xs text-white outline-none focus:border-[hsl(var(--neon))]/60"
              >
                <option value="">genel</option>
                {(topics || []).map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    #{topic.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="mono-label" htmlFor="post-flair">etiket (flair)</label>
              <input
                id="post-flair"
                value={flair}
                onChange={(event) => setFlair(event.target.value)}
                placeholder="REHBER"
                maxLength={24}
                className="h-9 w-full border border-[hsl(200_30%_18%)] bg-black/40 px-3 font-mono text-xs uppercase outline-none focus:border-[hsl(var(--neon))]/60"
              />
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">yazar</span>
              <span className="font-mono text-[10px] text-white/80">{handle}</span>
            </div>

            {config.allow_attachments && visibility === "public" && (
              <div className="space-y-2 pt-1">
                <span className="mono-label">ek dosya</span>
                <label className="flex cursor-pointer items-center gap-2 border border-dashed border-[hsl(200_30%_20%)] px-3 py-2 font-mono text-[10px] text-muted-foreground transition hover:border-[hsl(var(--neon))]/50">
                  <ImagePlus className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{file?.name || "görsel / dosya seç"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                  />
                </label>
                <p className="font-mono text-[9px] leading-relaxed text-muted-foreground/60">
                  ek dosyalar şifrelenmez ve herkese açık bağlantıyla saklanır.
                </p>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={busy || !title.trim() || !body.trim()}
            className="h-11 w-full rounded-none bg-[hsl(var(--neon))] font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-black hover:bg-[hsl(var(--neon))]/85"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> şifreleniyor…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> şifrele ve yayınla
              </>
            )}
          </Button>
          <p className="text-center font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/60">
            düz metin cihazından çıkmaz
          </p>
        </aside>
      </form>

      <VaultDialog open={vaultOpen} onOpenChange={setVaultOpen} />
    </div>
  );
}