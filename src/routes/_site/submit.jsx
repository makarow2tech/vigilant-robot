import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, ImagePlus, Lock, LockKeyhole, Send, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { encryptFields } from "@/lib/crypto";
import { anonSecretHash, getAnonIdentity } from "@/lib/anon";
import { useVaultVersion } from "@/lib/useVault";
import { createPost, getMyProfile, getSiteConfig, listTopics } from "@/lib/server-fns";
import VaultDialog from "@/components/crypto/VaultDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const vaultVersion = useVaultVersion();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topicId, setTopicId] = useState(topics?.[0]?.id || "");
  const [flair, setFlair] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [anonymous, setAnonymous] = useState(!user);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    getMyProfile().then(setProfile).catch(() => setProfile(null));
  }, [user?.id, vaultVersion]);

  useEffect(() => {
    setAnonymous(!user);
  }, [user?.id]);

  const publicKey = profile?.public_key || "";
  const selectedTopic = topics.find((topic) => topic.id === topicId);

  const submit = async (event) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Başlık ve içerik gerekli.");
      return;
    }
    if (body.length > (config.max_post_length || 20000)) {
      toast.error(`İçerik en fazla ${config.max_post_length} karakter olabilir.`);
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

      const created = await createPost({
        data: {
          title_cipher: encrypted.ciphers.title,
          body_cipher: encrypted.ciphers.body,
          envelopes: encrypted.envelopes,
          visibility,
          topic_id: selectedTopic?.id || "",
          topic_slug: selectedTopic?.slug || "",
          topic_name: selectedTopic?.name || "",
          flair: flair.trim(),
          ...attachment,
          author_name: anonymous ? getAnonIdentity().name : user?.full_name || "kullanıcı",
          is_anon: anonymous,
          anon_secret_hash: anonymous ? await anonSecretHash() : "",
          anon_id: anonymous ? getAnonIdentity().id : "",
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
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Yeni gönderi</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Başlık ve gövde tarayıcında şifrelenir. Sunucuya yalnızca AES-256-GCM şifreli blok ve RSA-4096 zarfları gider.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--neon))]/30 bg-[hsl(var(--neon))]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--neon))]">
          <ShieldCheck className="h-3 w-3" /> uçtan uca şifreli
        </span>
      </div>

      <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="space-y-2">
            <Label className="mono-label">başlık</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Şifrelenecek başlık…"
              className="rounded-xl border-white/10 bg-white/[0.03]"
            />
          </div>
          <div className="space-y-2">
            <Label className="mono-label">içerik</Label>
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Markdown desteklenmez; düz metin şifrelenir."
              className="min-h-[260px] rounded-xl border-white/10 bg-white/[0.03] font-mono text-sm leading-relaxed"
            />
            <p className="text-right font-mono text-[10px] text-muted-foreground">
              {body.length}/{config.max_post_length || 20000}
            </p>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="mono-label">görünürlük</h2>
            <div className="mt-3 grid gap-2">
              {[
                { key: "public", label: "Herkese açık", hint: "Topluluk anahtarıyla herkes okuyabilir", icon: Eye },
                { key: "private", label: "Özel", hint: "Yalnızca senin anahtarın çözer", icon: LockKeyhole },
              ].map(({ key, label, hint, icon: Icon }) => {
                const disabled = key === "private" && !config.allow_private_posts;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => setVisibility(key)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition disabled:opacity-40",
                      visibility === key
                        ? "border-[hsl(var(--neon))]/50 bg-[hsl(var(--neon))]/10"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20"
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm text-white">
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] text-muted-foreground">{hint}</span>
                  </button>
                );
              })}
            </div>
            {visibility === "private" && !publicKey && (
              <Button type="button" size="sm" onClick={() => setVaultOpen(true)} className="mt-3 w-full rounded-xl bg-white text-black">
                Kasayı oluştur
              </Button>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="space-y-2">
              <Label className="mono-label">topluluk</Label>
              <select
                value={topicId}
                onChange={(event) => setTopicId(event.target.value)}
                className="h-9 w-full rounded-xl border border-white/10 bg-[#0b0b10] px-3 text-sm outline-none"
              >
                <option value="">genel</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    #{topic.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="mono-label">etiket (flair)</Label>
              <Input
                value={flair}
                onChange={(event) => setFlair(event.target.value)}
                placeholder="REHBER"
                className="rounded-xl border-white/10 bg-white/[0.03] font-mono text-xs uppercase"
              />
            </div>

            <label className="flex items-center justify-between gap-3 pt-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">anonim gönder</span>
              <Switch checked={anonymous} onCheckedChange={setAnonymous} disabled={!user} />
            </label>

            {config.allow_attachments && visibility === "public" && (
              <div className="space-y-2 pt-2">
                <Label className="mono-label">ek dosya</Label>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-2 text-xs text-muted-foreground hover:border-white/30">
                  <ImagePlus className="h-3.5 w-3.5" />
                  <span className="truncate">{file?.name || "görsel / dosya seç"}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.txt,.md,.zip"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                  />
                </label>
                <p className="font-mono text-[9px] text-muted-foreground">Dosyalar herkese açık bağlantıyla saklanır.</p>
              </div>
            )}
          </div>

          <Button type="submit" disabled={busy} className="w-full rounded-xl bg-white text-black hover:bg-white/90">
            <Send className="mr-2 h-4 w-4" /> {busy ? "Şifreleniyor…" : "Şifrele ve yayınla"}
          </Button>
          {!user && (
            <p className="text-center font-mono text-[10px] text-muted-foreground">
              Anonim gönderi · <Link to="/login" className="text-[hsl(var(--neon))]">giriş yap</Link> ile kimlik kazan
            </p>
          )}
        </aside>
      </form>

      <VaultDialog open={vaultOpen} onOpenChange={setVaultOpen} />
    </div>
  );
}