import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createTopic } from "@/lib/server-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ACCENTS = ["#7CF9FF", "#FF5CF6", "#B4FF5C", "#FFB45C", "#7C9CFF", "#FFFFFF"];

export default function TopicCreator() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    accent: ACCENTS[0],
    icon: "#",
    custom_css: "",
    custom_html: "",
    rules: "",
  });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await createTopic({ data: { ...form, name: form.name.trim() } });
      toast.success("Topluluk oluşturuldu");
      setOpen(false);
      setForm({ name: "", description: "", accent: ACCENTS[0], icon: "#", custom_css: "", custom_html: "", rules: "" });
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
        <Button className="rounded-xl bg-white text-black hover:bg-white/90">
          <Plus className="mr-2 h-4 w-4" /> Topluluk oluştur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-2xl border-white/10 bg-[#0a0a0f] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Yeni başlık / topluluk</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Topluluğunu metinle kur ya da tamamen kendi HTML ve CSS'inle tasarla.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="mono-label">ad</Label>
              <Input
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="kriptografi"
                className="rounded-xl border-white/10 bg-white/[0.03]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="mono-label">simge</Label>
              <Input
                value={form.icon}
                onChange={(event) => update("icon", event.target.value)}
                maxLength={4}
                className="rounded-xl border-white/10 bg-white/[0.03]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="mono-label">açıklama</Label>
            <Textarea
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              className="min-h-[70px] rounded-xl border-white/10 bg-white/[0.03]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="mono-label">vurgu rengi</Label>
            <div className="flex gap-2">
              {ACCENTS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => update("accent", color)}
                  className="h-7 w-7 rounded-full border-2 transition"
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
            <Label className="mono-label">kuralar</Label>
            <Textarea
              value={form.rules}
              onChange={(event) => update("rules", event.target.value)}
              className="min-h-[60px] rounded-xl border-white/10 bg-white/[0.03]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="mono-label">özel css</Label>
            <Textarea
              value={form.custom_css}
              onChange={(event) => update("custom_css", event.target.value)}
              placeholder="header h1 { letter-spacing: .3em; }"
              className="min-h-[90px] rounded-xl border-white/10 bg-white/[0.03] font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="mono-label">özel html başlık alanı</Label>
            <Textarea
              value={form.custom_html}
              onChange={(event) => update("custom_html", event.target.value)}
              placeholder="<h1 style='font-size:3rem'>Kendi başlığın</h1>"
              className="min-h-[80px] rounded-xl border-white/10 bg-white/[0.03] font-mono text-xs"
            />
          </div>
          <Button type="submit" disabled={busy || form.name.trim().length < 2} className="w-full rounded-xl bg-white text-black">
            <Sparkles className="mr-2 h-4 w-4" /> {busy ? "Oluşturuluyor…" : "Topluluğu yayınla"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}