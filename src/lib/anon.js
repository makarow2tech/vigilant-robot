import { sha256Hex } from "@/lib/crypto";

const KEY = "krypt.anon";

function randomId(len = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, len)
    .toUpperCase();
}

export function getAnonIdentity() {
  if (typeof window === "undefined") return { id: null, name: "Anon", secret: null };
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) {
      const parsed = JSON.parse(existing);
      if (parsed?.id && parsed?.secret) return parsed;
    }
  } catch {
    /* bozuk kayıt yeniden üretilir */
  }
  const identity = {
    id: `anon_${crypto.randomUUID()}`,
    secret: crypto.randomUUID() + crypto.randomUUID(),
    name: `Anon-${randomId(4)}`,
  };
  window.localStorage.setItem(KEY, JSON.stringify(identity));
  return identity;
}

export async function anonSecretHash() {
  const identity = getAnonIdentity();
  return identity.secret ? sha256Hex(identity.secret) : "";
}

// Kimlik: giriş yapmış kullanıcı ya da bu tarayıcının anonim anahtarı
export function voterKey(user) {
  if (user?.id) return user.id;
  return getAnonIdentity().id;
}