// Oturumluk kasa durumu: özel anahtar yalnızca sessionStorage'da tutulur.
// Kasa bu tarayıcının anonim kimliğine bağlıdır.
const listeners = new Set();

const SESSION_KEY = "krypt.vault.session";

export function getSessionPrivateKey() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSessionPrivateKey(privateKeyJwk) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(privateKeyJwk));
  listeners.forEach((fn) => fn());
}

export function lockVault() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_KEY);
  listeners.forEach((fn) => fn());
}

export function subscribeVault(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}