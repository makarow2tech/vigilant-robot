// ============================================================================
// KRYPT · uçtan uca şifreleme çekirdeği
// İçerik: AES-256-GCM  ·  Kişisel anahtarlar: RSA-OAEP (4096 bit, SHA-256)
// Public içerik anahtarı: AES-256 zarf (topluluk anahtarı, istemcide türetilir)
// Kasa: PBKDF2-SHA256 (310k iterasyon) ile türetilen AES anahtarı
// Hiçbir düz metin sunucuya gitmez; sunucu yalnızca şifreli blok ve zarfları saklar.
// ============================================================================

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toB64(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(out);
}

export function fromB64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// Topluluk anahtarı — public gönderiler herkes tarafından okunabilsin diye
// istemcide türetilir. Sunucu bu anahtarın hiçbir parçasını saklamaz; çözme
// daima tarayıcıda yapılır.
// ---------------------------------------------------------------------------
const COMMUNITY_PASSPHRASE = "krypt.community.v1";
const COMMUNITY_SALT = "krypt.community.salt";
const COMMUNITY_ITERATIONS = 100000;

let communityKeyPromise = null;

export function communityKey() {
  communityKeyPromise ??= (async () => {
    const base = await crypto.subtle.importKey("raw", enc.encode(COMMUNITY_PASSPHRASE), "PBKDF2", false, [
      "deriveKey",
    ]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: enc.encode(COMMUNITY_SALT), iterations: COMMUNITY_ITERATIONS, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  })();
  return communityKeyPromise;
}

// ---------------------------------------------------------------------------
// Kişisel anahtar çifti (RSA-4096) — yalnızca özel içerik ve kasa için
// ---------------------------------------------------------------------------
const RSA_PARAMS = { name: "RSA-OAEP", hash: "SHA-256" };
const RSA_GEN = {
  name: "RSA-OAEP",
  modulusLength: 4096,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};

function importRsaPublic(jwk) {
  return crypto.subtle.importKey("jwk", jwk, RSA_PARAMS, true, ["encrypt"]);
}

function importRsaPrivate(jwk) {
  return crypto.subtle.importKey("jwk", jwk, RSA_PARAMS, true, ["decrypt"]);
}

// content key cache: aynı zarfla gelen kartlar için tekrar çözme yapılmaz
const keyCache = new Map();

async function unwrapContentKey(envelope, privateKeyJwk) {
  const cacheKey = String(envelope.ct).slice(0, 64);
  if (keyCache.has(cacheKey)) return keyCache.get(cacheKey);

  let raw;
  if (envelope.scope === "community") {
    const [ivB64, ctB64] = String(envelope.ct).split(".");
    const key = await communityKey();
    raw = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(ivB64) }, key, fromB64(ctB64));
  } else {
    if (!privateKeyJwk) {
      const error = new Error("VAULT_LOCKED");
      error.code = "VAULT_LOCKED";
      throw error;
    }
    const rsaKey = await importRsaPrivate(privateKeyJwk);
    raw = await crypto.subtle.decrypt(RSA_PARAMS, rsaKey, fromB64(envelope.ct));
  }

  keyCache.set(cacheKey, raw);
  return raw;
}

// ---------------------------------------------------------------------------
// Şifreleme / çözme
// ---------------------------------------------------------------------------

export async function encryptText(text, { visibility = "public", ownerPublicKey = null } = {}) {
  const rawKey = randomBytes(32);
  const aesKey = await crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, enc.encode(text));

  const envelopes = [];
  if (visibility === "private") {
    if (!ownerPublicKey) {
      const error = new Error("Özel içerik için kasa anahtarı gerekli.");
      error.code = "VAULT_MISSING";
      throw error;
    }
    const jwk = typeof ownerPublicKey === "string" ? JSON.parse(ownerPublicKey) : ownerPublicKey;
    const pub = await importRsaPublic(jwk);
    const wrapped = await crypto.subtle.encrypt(RSA_PARAMS, pub, rawKey);
    envelopes.push({ scope: "owner", alg: "RSA-OAEP-4096", ct: toB64(wrapped) });
  } else {
    const key = await communityKey();
    const wrapIv = randomBytes(12);
    const wrapped = await crypto.subtle.encrypt({ name: "AES-GCM", iv: wrapIv }, key, rawKey);
    envelopes.push({ scope: "community", alg: "AES-256-KW", ct: `${toB64(wrapIv)}.${toB64(wrapped)}` });
  }

  return {
    cipher: JSON.stringify({ v: 1, alg: "AES-256-GCM", iv: toB64(iv), ct: toB64(ct) }),
    envelopes: JSON.stringify(envelopes),
  };
}

function pickEnvelopes(envelopesJson, field) {
  const parsed = typeof envelopesJson === "string" ? JSON.parse(envelopesJson || "[]") : envelopesJson;
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") return parsed[field] ?? [];
  return [];
}

export async function decryptText(cipherJson, envelopesJson, { privateKeyJwk = null, field = "body" } = {}) {
  if (!cipherJson) return "";
  const payload = typeof cipherJson === "string" ? JSON.parse(cipherJson) : cipherJson;
  const envelopes = pickEnvelopes(envelopesJson, field);
  if (!envelopes.length) return "";

  const envelope =
    envelopes.find((item) => item.scope === "community") ??
    envelopes.find((item) => (item.scope === "owner" ? Boolean(privateKeyJwk) : false)) ??
    envelopes.find((item) => item.scope === "owner");

  if (!envelope) return "";

  const rawKey = await unwrapContentKey(envelope, privateKeyJwk);
  const aesKey = await crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(payload.iv) },
    aesKey,
    fromB64(payload.ct)
  );
  return dec.decode(plain);
}

export function isLockedContent(envelopesJson, field = "body") {
  try {
    const envelopes = pickEnvelopes(envelopesJson, field);
    return envelopes.length > 0 && !envelopes.some((item) => item.scope === "community");
  } catch {
    return false;
  }
}

// Başlık + gövde: zarflar alan adına göre gruplanır.
export async function encryptFields(fields, options = {}) {
  const ciphers = {};
  const envelopes = {};
  for (const [name, value] of Object.entries(fields)) {
    const result = await encryptText(value, options);
    ciphers[name] = result.cipher;
    envelopes[name] = JSON.parse(result.envelopes);
  }
  return { ciphers, envelopes: JSON.stringify(envelopes) };
}

// ---------------------------------------------------------------------------
// Kasa (kişisel anahtar çifti + parola ile korunan özel anahtar)
// ---------------------------------------------------------------------------

const KDF_ITERATIONS = 310000;

async function deriveWrappingKey(passphrase, salt) {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: KDF_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function createVault(passphrase) {
  if (!passphrase || passphrase.length < 8) {
    const error = new Error("Kasa parolası en az 8 karakter olmalı.");
    error.code = "WEAK_PASSPHRASE";
    throw error;
  }
  const pair = await crypto.subtle.generateKey(RSA_GEN, true, ["encrypt", "decrypt"]);
  const publicKeyJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);

  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const wrapKey = await deriveWrappingKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrapKey,
    enc.encode(JSON.stringify(privateKeyJwk))
  );

  return {
    publicKeyJwk,
    privateKeyJwk,
    vault: JSON.stringify({
      v: 1,
      kdf: "PBKDF2-SHA256",
      iterations: KDF_ITERATIONS,
      salt: toB64(salt),
      iv: toB64(iv),
      ct: toB64(ct),
    }),
  };
}

export async function unlockVault(vaultJson, passphrase) {
  const blob = typeof vaultJson === "string" ? JSON.parse(vaultJson) : vaultJson;
  const wrapKey = await deriveWrappingKey(passphrase, fromB64(blob.salt));
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(blob.iv) }, wrapKey, fromB64(blob.ct));
    return JSON.parse(dec.decode(plain));
  } catch {
    const error = new Error("Kasa parolası hatalı.");
    error.code = "BAD_PASSPHRASE";
    throw error;
  }
}