// KRYPT iş mantığı — sunucu hiçbir zaman düz metin görmez, yalnızca şifreli blok ve zarfları saklar.
// anon_secret_hash istemcilere asla dönmez; silme yetkisi yalnızca bu hash ile doğrulanır.
import { rows, configEntry, insert, update, removeWhere, save, loadDb } from "./store.mjs";

export const DEFAULT_CONFIG = {
  key: "main",
  site_name: "KRYPT",
  tagline: "şifreli tartışma ağı",
  hero_title: "Tartışma burada şifrelenir.",
  hero_subtitle:
    "Gönderiler tarayıcında şifrelenir, anahtarınla sarılır. Sunucu yalnızca şifreli blokları saklar — düz metni hiç görmez.",
  announcement: "",
  community_rules: "1. Kişisel veri paylaşma.\n2. Şifreli içeriği izinsiz çözme.\n3. Spam ve manipülasyon yasak.",
  maintenance: false,
  maintenance_text: "Kısa bir bakım çalışması yapıyoruz.",
  max_post_length: 20000,
  allow_private_posts: true,
  allow_attachments: true,
  allow_new_topics: true,
  allow_downvotes: true,
  neon_hue: 158,
  neon2_hue: 320,
};

const CONFIG_KEYS = Object.keys(DEFAULT_CONFIG);

const httpError = (status, message) => Object.assign(new Error(message), { status });

function publicPost(record) {
  if (!record) return null;
  const { anon_secret_hash, ...rest } = record;
  if (rest.visibility !== "private") delete rest.owner_public_key;
  return rest;
}

function publicComment(record) {
  if (!record) return null;
  const { anon_secret_hash, ...rest } = record;
  return rest;
}

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

const SEED_TOPICS = [
  { name: "kriptografi", slug: "kriptografi", description: "Şifreleme şemaları, anahtar yönetimi ve kriptografik protokol tartışmaları.", accent: "#00FF9C", icon: "⌘", rules: "1. Pratik kanıt olmadan iddia etme.\n2. Anahtar paylaşma." },
  { name: "güvenlik", slug: "guvenlik", description: "Açıklar, tehdit modelleri, sızma testi notları ve savunma teknikleri.", accent: "#FF2E9A", icon: "◈", rules: "1. İfşa etmeden önce sorumlu bildirim.\n2. Hedef gösterme yok." },
  { name: "sızıntılar", slug: "sizintilar", description: "Veri ihlali analizleri, adli inceleme notları ve olay sonrası değerlendirmeler.", accent: "#31D8FF", icon: "◎", rules: "1. Kişisel veri paylaşma.\n2. Kaynak doğrula." },
  { name: "gizlilik", slug: "gizlilik", description: "Anonimlik, iz bırakmama, opsec ve mahremiyet araçları.", accent: "#B4FF5C", icon: "◐", rules: "1. Opsec tavsiyesi ver, kişisel veri isteme." },
];

export async function init() {
  await loadDb();
  if (!rows("topics").length) {
    for (const seed of SEED_TOPICS) {
      insert("topics", { ...seed, is_private: false, post_count: 0, member_count: 0, pinned: false });
    }
    save();
  }
}

// --- site ayarları ----------------------------------------------------------
export function readConfig() {
  const row = configEntry();
  const config = { ...DEFAULT_CONFIG };
  if (row) {
    for (const key of CONFIG_KEYS) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== "") config[key] = row[key];
    }
  }
  return config;
}

// --- topluluklar ------------------------------------------------------------
export function listTopics() {
  return [...rows("topics")].sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || "")));
}

export function createTopic(data) {
  const slug = slugify(data.name);
  if (!slug) throw httpError(400, "Geçerli bir topluluk adı girin.");
  if (rows("topics").some((topic) => topic.slug === slug)) throw httpError(400, "Bu isimde bir topluluk zaten var.");

  const created = insert("topics", {
    name: String(data.name).trim().slice(0, 60),
    slug,
    description: (data.description || "").slice(0, 400),
    accent: data.accent || "#00FF9C",
    icon: (data.icon || "#").slice(0, 4),
    rules: (data.rules || "").slice(0, 2000),
    is_private: Boolean(data.is_private),
    post_count: 0,
    member_count: 1,
    pinned: false,
  });
  save();
  return created;
}

function bumpTopic(topicId, delta) {
  if (!topicId) return;
  const topic = rows("topics").find((item) => item.id === topicId);
  if (!topic) return;
  update("topics", topicId, { post_count: Math.max(0, (topic.post_count || 0) + delta) });
}

// --- akış -------------------------------------------------------------------
function sortFeed(items, sort) {
  const list = [...items];
  if (sort === "new") {
    list.sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || "")));
  } else if (sort === "top") {
    list.sort((a, b) => (b.score || 0) - (a.score || 0) || String(b.created_date || "").localeCompare(String(a.created_date || "")));
  } else {
    const heat = (item) => (item.score || 0) + (item.comment_count || 0) * 2;
    list.sort((a, b) => heat(b) - heat(a) || String(b.created_date || "").localeCompare(String(a.created_date || "")));
  }
  return list;
}

export function listFeed({ sort = "hot", topicSlug = "", q = "", limit = 20, cursor = "" } = {}) {
  let items = rows("posts").filter((post) => !post.is_removed);
  if (topicSlug) items = items.filter((post) => post.topic_slug === topicSlug);
  if (q) {
    const needle = String(q).toLowerCase();
    items = items.filter(
      (post) =>
        String(post.topic_name || "").toLowerCase().includes(needle) ||
        String(post.author_name || "").toLowerCase().includes(needle)
    );
  }

  const ordered = sortFeed(items, sort);
  const offset = Math.max(0, Number(cursor) || 0);
  const size = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const slice = ordered.slice(offset, offset + size);
  const hasMore = offset + size < ordered.length;

  return { items: slice.map(publicPost), next_cursor: hasMore ? String(offset + size) : null, has_more: hasMore };
}

export function getPost(id) {
  if (!id) return null;
  const record = rows("posts").find((post) => post.id === id);
  if (!record || record.is_removed) return null;
  return publicPost(record);
}

export function createPost(data) {
  if (!data.anon_id) throw httpError(400, "Anonim kimlik bulunamadı. Sayfayı yenileyin.");
  if (!data.anon_secret_hash) throw httpError(400, "Silme anahtarı oluşturulamadı. Sayfayı yenileyin.");
  if (data.visibility === "private" && !data.owner_public_key) throw httpError(400, "Özel gönderi için kasa açık olmalı.");

  const record = insert("posts", {
    topic_id: data.topic_id || "",
    topic_slug: data.topic_slug || "",
    topic_name: data.topic_name || "",
    title_cipher: data.title_cipher,
    body_cipher: data.body_cipher,
    envelopes: data.envelopes,
    visibility: data.visibility === "private" ? "private" : "public",
    owner_public_key: data.visibility === "private" ? data.owner_public_key || "" : "",
    flair: String(data.flair || "").toUpperCase().slice(0, 24),
    attachment_url: data.attachment_url || "",
    attachment_name: (data.attachment_name || "").slice(0, 120),
    attachment_type: data.attachment_type || "",
    author_id: data.anon_id,
    author_name: String(data.author_name || "anon").slice(0, 40),
    is_anon: true,
    upvotes: 0,
    downvotes: 0,
    score: 0,
    comment_count: 0,
    is_pinned: false,
    is_locked: false,
    is_removed: false,
  });

  insert("secrets", { record_id: record.id, record_type: "post", secret_hash: data.anon_secret_hash });
  bumpTopic(record.topic_id, 1);
  save();
  return publicPost(record);
}

export function deletePost({ id, anonSecretHash }) {
  const post = rows("posts").find((item) => item.id === id);
  if (!post) throw httpError(404, "Gönderi bulunamadı.");

  const secret = rows("secrets").find((item) => item.record_id === id && item.record_type === "post");
  if (!secret || secret.secret_hash !== anonSecretHash) throw httpError(403, "Bu gönderiyi silme yetkiniz yok.");

  const commentIds = rows("comments").filter((comment) => comment.post_id === id).map((comment) => comment.id);
  removeWhere("secrets", (item) => item.record_id === id || commentIds.includes(item.record_id));
  removeWhere("comments", (comment) => comment.post_id === id);
  removeWhere("votes", (item) => item.target_id === id);
  removeWhere("bookmarks", (item) => item.post_id === id);
  removeWhere("posts", (item) => item.id === id);
  bumpTopic(post.topic_id, -1);
  save();
  return { ok: true };
}

// --- yorumlar ---------------------------------------------------------------
export function listComments(postId) {
  if (!postId) return [];
  return rows("comments")
    .filter((comment) => comment.post_id === postId && !comment.is_removed)
    .sort((a, b) => String(a.created_date || "").localeCompare(String(b.created_date || "")))
    .map(publicComment);
}

export function createComment(data) {
  if (!data.anon_id) throw httpError(400, "Anonim kimlik bulunamadı. Sayfayı yenileyin.");
  if (!data.anon_secret_hash) throw httpError(400, "Silme anahtarı oluşturulamadı. Sayfayı yenileyin.");

  const post = rows("posts").find((item) => item.id === data.post_id);
  if (!post || post.is_removed) throw httpError(404, "Gönderi bulunamadı.");

  const record = insert("comments", {
    post_id: data.post_id,
    parent_id: data.parent_id || "",
    body_cipher: data.body_cipher,
    envelopes: data.envelopes,
    visibility: post.visibility === "private" ? "private" : "public",
    author_id: data.anon_id,
    author_name: String(data.author_name || "anon").slice(0, 40),
    is_anon: true,
    upvotes: 0,
    downvotes: 0,
    score: 0,
    depth: Math.min(Math.max(Number(data.depth) || 0, 0), 10),
    is_removed: false,
  });

  insert("secrets", { record_id: record.id, record_type: "comment", secret_hash: data.anon_secret_hash });
  update("posts", post.id, { comment_count: (post.comment_count || 0) + 1 });
  save();
  return publicComment(record);
}

function descendantIds(postId, rootId) {
  const all = rows("comments").filter((comment) => comment.post_id === postId);
  const ids = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const comment of all) {
      if (!ids.has(comment.id) && comment.parent_id && ids.has(comment.parent_id)) {
        ids.add(comment.id);
        grew = true;
      }
    }
  }
  return [...ids];
}

export function deleteComment({ id, anonSecretHash }) {
  const comment = rows("comments").find((item) => item.id === id);
  if (!comment) throw httpError(404, "Yorum bulunamadı.");

  const secret = rows("secrets").find((item) => item.record_id === id && item.record_type === "comment");
  if (!secret || secret.secret_hash !== anonSecretHash) throw httpError(403, "Bu yorumu silme yetkiniz yok.");

  const ids = descendantIds(comment.post_id, id);
  removeWhere("secrets", (item) => ids.includes(item.record_id));
  removeWhere("comments", (item) => ids.includes(item.id));
  removeWhere("votes", (item) => ids.includes(item.target_id));

  const post = rows("posts").find((item) => item.id === comment.post_id);
  if (post) update("posts", post.id, { comment_count: Math.max(0, (post.comment_count || 0) - ids.length) });

  save();
  return { ok: true, removed: ids };
}

// --- oylar ve kayıtlar ------------------------------------------------------
export function vote({ targetType, targetId, voterKey, value }) {
  if (!voterKey) throw httpError(400, "Oy için kimlik gerekli.");
  if (targetType !== "post" && targetType !== "comment") throw httpError(400, "Geçersiz hedef.");
  const nextValue = value > 0 ? 1 : value < 0 ? -1 : 0;

  const collection = targetType === "post" ? "posts" : "comments";
  const target = rows(collection).find((item) => item.id === targetId);
  if (!target) throw httpError(404, "Kayıt bulunamadı.");

  const existing = rows("votes").find(
    (item) => item.target_type === targetType && item.target_id === targetId && item.voter_key === voterKey
  );
  const previous = existing ? existing.value : 0;

  let upvotes = target.upvotes || 0;
  let downvotes = target.downvotes || 0;
  if (previous === 1) upvotes -= 1;
  if (previous === -1) downvotes -= 1;

  const finalValue = previous === nextValue ? 0 : nextValue;
  if (finalValue === 1) upvotes += 1;
  if (finalValue === -1) downvotes += 1;
  upvotes = Math.max(0, upvotes);
  downvotes = Math.max(0, downvotes);

  if (existing) {
    if (finalValue === 0) removeWhere("votes", (item) => item.id === existing.id);
    else update("votes", existing.id, { value: finalValue });
  } else if (finalValue !== 0) {
    insert("votes", { target_type: targetType, target_id: targetId, voter_key: voterKey, value: finalValue });
  }

  const score = upvotes - downvotes;
  update(collection, targetId, { upvotes, downvotes, score });
  save();
  return { upvotes, downvotes, score, myVote: finalValue };
}

export function myState({ voterKey, ids = [] }) {
  const result = { votes: {}, saved: {} };
  if (!voterKey || !ids.length) return result;
  const limited = ids.slice(0, 200);
  for (const item of rows("votes")) {
    if (item.voter_key === voterKey && limited.includes(item.target_id)) result.votes[item.target_id] = item.value;
  }
  for (const item of rows("bookmarks")) {
    if (item.voter_key === voterKey && limited.includes(item.post_id)) result.saved[item.post_id] = true;
  }
  return result;
}

export function toggleBookmark({ postId, voterKey }) {
  if (!voterKey || !postId) throw httpError(400, "Kayıt için kimlik gerekli.");
  const existing = rows("bookmarks").find((item) => item.post_id === postId && item.voter_key === voterKey);
  if (existing) {
    removeWhere("bookmarks", (item) => item.id === existing.id);
    save();
    return { saved: false };
  }
  insert("bookmarks", { post_id: postId, voter_key: voterKey });
  save();
  return { saved: true };
}

export function listBookmarks(voterKey) {
  if (!voterKey) return [];
  const ids = rows("bookmarks")
    .filter((item) => item.voter_key === voterKey)
    .sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || "")))
    .map((item) => item.post_id);

  return ids
    .map((id) => rows("posts").find((post) => post.id === id))
    .filter((post) => post && !post.is_removed)
    .map(publicPost);
}

// --- kasa -------------------------------------------------------------------
export function getMyVault(ownerKey) {
  if (!ownerKey) return null;
  const row = rows("vaults").find((item) => item.owner_key === ownerKey);
  if (!row) return null;
  return { vault: row.vault, public_key: row.public_key };
}

export function saveMyVault({ owner_key, public_key, vault }) {
  if (!owner_key) throw httpError(400, "Kasa için kimlik gerekli.");
  const existing = rows("vaults").find((item) => item.owner_key === owner_key);
  if (existing) update("vaults", existing.id, { public_key, vault });
  else insert("vaults", { owner_key, public_key, vault });
  save();
  return { ok: true };
}

export function getMyProfile(ownerKey) {
  const stored = getMyVault(ownerKey);
  if (!stored) return { public_key: "" };
  return { public_key: stored.public_key };
}
