import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getMyProfile, getSiteConfig } from "@/lib/server-fns";
import { hexToHslChannels } from "@/lib/color";
import { sanitizeCss } from "@/lib/sanitize";

// Site görünümünü admin ayarlarına ve kullanıcının kendi temasına bağlar.
export default function ThemeBridge() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { config } = await getSiteConfig();
        if (!alive) return;
        document.documentElement.style.setProperty("--neon", `${config.neon_hue} 100% 72%`);
        document.documentElement.style.setProperty("--neon-2", `${config.neon2_hue} 100% 74%`);
        const styleId = "krypt-global-css";
        let node = document.getElementById(styleId);
        if (!node) {
          node = document.createElement("style");
          node.id = styleId;
          document.head.appendChild(node);
        }
        node.textContent = sanitizeCss(config.global_css || "");
        if (config.site_name) document.title = `${config.site_name} — ${config.tagline || ""}`.trim();
      } catch {
        /* varsayılan tema korunur */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    getMyProfile()
      .then((profile) => {
        if (!alive || !profile) return;
        const channels = hexToHslChannels(profile.accent);
        if (channels) document.documentElement.style.setProperty("--neon", channels);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isAuthenticated, user?.id]);

  return null;
}