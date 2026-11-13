import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createTopic } from "@/lib/server-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const ACCENTS = ["#00FF9C", "#FF2E9A", "#31D8FF", "#B4FF5C", "#FFB45C", "#FFFFFF"];

export default function TopicCreator() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", accent: ACCENTS[0], icon: "#", rules: "" });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await createTopic({
        data: {
          name: form.name.trim(),
          description: form.description.trim(),
          accent: form.accent,
          icon: form.icon || "#",
          rules: form.rules.trim(),
        },
      });
      toast.success("Topluluk oluşturuldu");
      setOpen(false);
      setForm({ name: "", description: "", accent: ACCENTS[0], icon: "#", rules: "" });
      await router.invalidate();
    } catch (error) {
      toast.error(error?.message || "Topluluk oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-none bg-[hsl(var(--neon))] font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-black hover:bg-[hsl(var(--neon))]/85">
          <Plus className="mr-2 h-4 w-4" /> topluluk oluştur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-none border-[hsl(200_40%_20%)] bg-[#07070c] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-base uppercase tracking-[0.08em]">yeni topluluk</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
            Topluluğun kendi rengi, simgesi ve kuralları olur. İçindeki gönderiler yine uçtan uca şifreli kalır.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_90px]">
            <div className="space-y-1.5">
              <label className="mono-label" htmlFor="topic-name">ad</label>
              <input
                id="topic-name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="kriptografi"
                className="h-9 w-full border border-[hsl(200_30%_18%)] bg-black/40 px-3 font-mono text-sm outline-none focus:border-[hsl(var(--neon))]/60"
              />
            </div>
            <div className="space-y-1.5">
              <label className="mono-label" htmlFor="topic-icon">simge</label>
              <input
                id="topic-icon"
                value={form.icon}
                onChange={(event) => update("icon", event.target.value)}
                maxLength={4}
                className="h-9 w-full border border-[hsl(200_30%_18%)] bg-black/40 px-3 text-center font-mono text-sm outline-none focus:border-[hsl(var(--neon))]/60"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="mono-label" htmlFor="topic-desc">açıklama</label>
            <textarea
              id="topic-desc"
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              className="min-h-[70px] w-full border border-[hsl(200_30%_18%)] bg-black/40 px-3 py-2 font-mono text-xs outline-none focus:border-[hsl(var(--neon))]/60"
            />
          </div>
          <div className="space-y-1.5">
            <span className="mono-label">vurgu rengi</span>
            <div className="flex gap-2">
              {ACCENTS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => update("accent", color)}
                  className="h-7 w-7 border-2 transition"
                  style={{
                    background: color,
                    borderColor: form.accent === color ? "#fff" : "transparent",
                    boxShadow: form.accent === color ? `0 0 14px ${color}` : "none",
                  }}
                  aria-label={color}
                />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="mono-label" htmlFor="topic-rules">kurallar</label>
            <textarea
              id="topic-rules"
              value={form.rules}
              onChange={(event) => update("rules", event.target.value)}
              className="min-h-[60px] w-full border border-[hsl(200_30%_18%)] bg-black/40 px-3 py-2 font-mono text-xs outline-none focus:border-[hsl(var(--neon))]/60"
            />
          </div>
          <Button
            type="submit"
            disabled={busy || form.name.trim().length < 2}
            className="w-full rounded-none bg-[hsl(var(--neon))] font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-black hover:bg-[hsl(var(--neon))]/85"
          >
            <Sparkles className="mr-2 h-4 w-4" /> {busy ? "oluşturuluyor…" : "topluluğu yayınla"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}