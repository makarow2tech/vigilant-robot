// KRYPT veri katmanı — yalnızca sunucuda çalışır.
// Sunucu hiçbir zaman düz metin görmez: yalnızca şifreli bloklar ve zarflar saklanır.
// anon_secret_hash istemcilere asla dönmez; silme yetkisi yalnızca bu hash ile doğrulanır.

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

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

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

// ---------------------------------------------------------------------------
// Site ayarları
// ---------------------------------------------------------------------------
// Kısa ömürlü bellek önbelleği: her sayfa görüntülemesinde aynı ayarları tekrar okumaz.
const CACHE_MS = 20000;
let configCache = { at: 0, data: null };
let topicCache = { at: 0, data: null };

export async function readConfig(db) {
  if (configCache.data && Date.now() - configCache.at < CACHE_MS) return configCache.data;
  const page = await db.entities.SiteConfig.filter({ key: "main" }, { limit: 1 });
  const row = page?.items?.[0];
  const config = { ...DEFAULT_CONFIG };
  if (row) {
    for (const key of CONFIG_KEYS) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== "") config[key] = row[key];
    }
  }
  configCache = { at: Date.now(), data: config };
  return config;
}

// ---------------------------------------------------------------------------
// Topluluklar
// ---------------------------------------------------------------------------
export async function listTopics(db) {
  if (topicCache.data && Date.now() - topicCache.at < CACHE_MS) return topicCache.data;
  const page = await db.entities.Topic.list({ sort: "-created_date", limit: 100 });
  const items = page?.items ?? [];
  topicCache = { at: Date.now(), data: items };
  return items;
}

export async function createTopic(db, data) {
  const slug = slugify(data.name);
  if (!slug) throw httpError(400, "Geçerli bir topluluk adı girin.");
  const existing = await db.entities.Topic.filter({ slug }, { limit: 1 });
  if (existing?.items?.length) throw httpError(400, "Bu isimde bir topluluk zaten var.");

  const created = await db.entities.Topic.create({
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
  topicCache = { at: 0, data: null };
  return created;
}

async function bumpTopic(db, topicId, delta) {
  if (!topicId) return;
  const topic = await db.entities.Topic.get(topicId).catch(() => null);
  if (!topic) return;
  const next = Math.max(0, (topic.post_count || 0) + delta);
  await db.entities.Topic.update(topicId, { post_count: next });
}

// ---------------------------------------------------------------------------
// Akış
// ---------------------------------------------------------------------------
function sortFeed(items, sort) {
  const list = [...items];
  if (sort === "new") {
    list.sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || "")));
  } else if (sort === "top") {
    list.sort(
      (a, b) => (b.score || 0) - (a.score || 0) || String(b.created_date || "").localeCompare(String(a.created_date || ""))
    );
  } else {
    const heat = (item) => (item.score || 0) + (item.comment_count || 0) * 2;
    list.sort((a, b) => heat(b) - heat(a) || String(b.created_date || "").localeCompare(String(a.created_date || "")));
  }
  return list;
}

export async function listFeed(db, { sort = "hot", topicSlug = "", q = "", limit = 20, cursor = "" } = {}) {
  const page = await db.entities.Post.list({ sort: "-created_date", limit: 200 });
  let items = (page?.items ?? []).filter((post) => !post.is_removed);

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

  return {
    items: slice.map(publicPost),
    next_cursor: hasMore ? String(offset + size) : null,
    has_more: hasMore,
  };
}

export async function getPost(db, id) {
  if (!id) return null;
  const record = await db.entities.Post.get(id).catch(() => null);
  if (!record || record.is_removed) return null;
  return publicPost(record);
}

export async function createPost(db, data) {
  if (!data.anon_id) throw httpError(400, "Anonim kimlik bulunamadı. Sayfayı yenileyin.");
  if (!data.anon_secret_hash) throw httpError(400, "Silme anahtarı oluşturulamadı. Sayfayı yenileyin.");
  if (data.visibility === "private" && !data.owner_public_key) {
    throw httpError(400, "Özel gönderi için kasa açık olmalı.");
  }

  const record = await db.entities.Post.create({
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

  await db.entities.AuthorSecret.create({
    record_id: record.id,
    record_type: "post",
    secret_hash: data.anon_secret_hash,
  });

  await bumpTopic(db, record.topic_id, 1);
  return publicPost(record);
}

export async function deletePost(db, { id, anonSecretHash }) {
  const post = await db.entities.Post.get(id).catch(() => null);
  if (!post) throw httpError(404, "Gönderi bulunamadı.");

  const secretPage = await db.entities.AuthorSecret.filter(
    { record_id: id, record_type: "post" },
    { limit: 1 }
  );
  const secret = secretPage?.items?.[0];
  if (!secret || secret.secret_hash !== anonSecretHash) {
    throw httpError(403, "Bu gönderiyi silme yetkiniz yok.");
  }

  const commentPage = await db.entities.Comment.filter({ post_id: id }, { limit: 1000 });
  const commentIds = (commentPage?.items ?? []).map((comment) => comment.id);
  if (commentIds.length) {
    await db.entities.AuthorSecret.deleteMany({ record_id: { $in: commentIds } });
  }
  await db.entities.AuthorSecret.delete(secret.id);

  await db.entities.Comment.deleteMany({ post_id: id });
  await db.entities.Vote.deleteMany({ target_id: id });
  await db.entities.Bookmark.deleteMany({ post_id: id });
  await db.entities.Post.delete(id);
  await bumpTopic(db, post.topic_id, -1);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Yorumlar
// ---------------------------------------------------------------------------
export async function listComments(db, postId) {
  if (!postId) return [];
  const page = await db.entities.Comment.filter({ post_id: postId }, { sort: "created_date", limit: 500 });
  return (page?.items ?? []).filter((comment) => !comment.is_removed).map(publicComment);
}

export async function createComment(db, data) {
  if (!data.anon_id) throw httpError(400, "Anonim kimlik bulunamadı. Sayfayı yenileyin.");
  if (!data.anon_secret_hash) throw httpError(400, "Silme anahtarı oluşturulamadı. Sayfayı yenileyin.");

  const post = await db.entities.Post.get(data.post_id).catch(() => null);
  if (!post || post.is_removed) throw httpError(404, "Gönderi bulunamadı.");

  const record = await db.entities.Comment.create({
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

  await db.entities.AuthorSecret.create({
    record_id: record.id,
    record_type: "comment",
    secret_hash: data.anon_secret_hash,
  });

  await db.entities.Post.update(post.id, { comment_count: (post.comment_count || 0) + 1 });
  return publicComment(record);
}

async function descendantIds(db, postId, rootId) {
  const page = await db.entities.Comment.filter({ post_id: postId }, { limit: 1000 });
  const all = page?.items ?? [];
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

export async function deleteComment(db, { id, anonSecretHash }) {
  const comment = await db.entities.Comment.get(id).catch(() => null);
  if (!comment) throw httpError(404, "Yorum bulunamadı.");
  const secretPage = await db.entities.AuthorSecret.filter(
    { record_id: id, record_type: "comment" },
    { limit: 1 }
  );
  const secret = secretPage?.items?.[0];
  if (!secret || secret.secret_hash !== anonSecretHash) {
    throw httpError(403, "Bu yorumu silme yetkiniz yok.");
  }

  const ids = await descendantIds(db, comment.post_id, id);
  await db.entities.AuthorSecret.deleteMany({ record_id: { $in: ids } });
  for (const commentId of ids) {
    await db.entities.Vote.deleteMany({ target_id: commentId });
    await db.entities.Comment.delete(commentId);
  }

  const post = await db.entities.Post.get(comment.post_id).catch(() => null);
  if (post) {
    await db.entities.Post.update(post.id, {
      comment_count: Math.max(0, (post.comment_count || 0) - ids.length),
    });
  }

  return { ok: true, removed: ids };
}

// ---------------------------------------------------------------------------
// Oylar ve kayıtlar
// ---------------------------------------------------------------------------
export async function vote(db, { targetType, targetId, voterKey, value }) {
  if (!voterKey) throw httpError(400, "Oy için kimlik gerekli.");
  if (targetType !== "post" && targetType !== "comment") throw httpError(400, "Geçersiz hedef.");
  const nextValue = value > 0 ? 1 : value < 0 ? -1 : 0;

  const target =
    targetType === "post"
      ? await db.entities.Post.get(targetId).catch(() => null)
      : await db.entities.Comment.get(targetId).catch(() => null);
  if (!target) throw httpError(404, "Kayıt bulunamadı.");

  const existingPage = await db.entities.Vote.filter(
    { target_type: targetType, target_id: targetId, voter_key: voterKey },
    { limit: 1 }
  );
  const existing = existingPage?.items?.[0] || null;
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
    if (finalValue === 0) await db.entities.Vote.delete(existing.id);
    else await db.entities.Vote.update(existing.id, { value: finalValue });
  } else if (finalValue !== 0) {
    await db.entities.Vote.create({
      target_type: targetType,
      target_id: targetId,
      voter_key: voterKey,
      value: finalValue,
    });
  }

  const score = upvotes - downvotes;
  const collection = targetType === "post" ? db.entities.Post : db.entities.Comment;
  await collection.update(targetId, { upvotes, downvotes, score });

  return { upvotes, downvotes, score, myVote: finalValue };
}

export async function myState(db, { voterKey, ids = [] }) {
  const result = { votes: {}, saved: {} };
  if (!voterKey || !ids.length) return result;

  const votePage = await db.entities.Vote.filter(
    { voter_key: voterKey, target_id: { $in: ids.slice(0, 200) } },
    { limit: 500 }
  );
  for (const voteRecord of votePage?.items ?? []) result.votes[voteRecord.target_id] = voteRecord.value;

  const bookmarkPage = await db.entities.Bookmark.filter(
    { voter_key: voterKey, post_id: { $in: ids.slice(0, 200) } },
    { limit: 500 }
  );
  for (const bookmark of bookmarkPage?.items ?? []) result.saved[bookmark.post_id] = true;

  return result;
}

export async function toggleBookmark(db, { postId, voterKey }) {
  if (!voterKey || !postId) throw httpError(400, "Kayıt için kimlik gerekli.");
  const page = await db.entities.Bookmark.filter({ post_id: postId, voter_key: voterKey }, { limit: 1 });
  const existing = page?.items?.[0];
  if (existing) {
    await db.entities.Bookmark.delete(existing.id);
    return { saved: false };
  }
  await db.entities.Bookmark.create({ post_id: postId, voter_key: voterKey });
  return { saved: true };
}

export async function listBookmarks(db, voterKey) {
  if (!voterKey) return [];
  const page = await db.entities.Bookmark.filter({ voter_key: voterKey }, { sort: "-created_date", limit: 100 });
  const ids = (page?.items ?? []).map((item) => item.post_id);
  if (!ids.length) return [];
  const posts = await Promise.all(ids.map((id) => db.entities.Post.get(id).catch(() => null)));
  return posts.filter((post) => post && !post.is_removed).map(publicPost);
}

// ---------------------------------------------------------------------------
// Kasa
// ---------------------------------------------------------------------------
export async function getMyVault(db, ownerKey) {
  if (!ownerKey) return null;
  const page = await db.entities.Vault.filter({ owner_key: ownerKey }, { limit: 1 });
  const row = page?.items?.[0];
  if (!row) return null;
  return { vault: row.vault, public_key: row.public_key };
}

export async function saveMyVault(db, { owner_key, public_key, vault }) {
  if (!owner_key) throw httpError(400, "Kasa için kimlik gerekli.");
  const page = await db.entities.Vault.filter({ owner_key }, { limit: 1 });
  const existing = page?.items?.[0];
  if (existing) {
    await db.entities.Vault.update(existing.id, { public_key, vault });
  } else {
    await db.entities.Vault.create({ owner_key, public_key, vault });
  }
  return { ok: true };
}

export async function getMyProfile(db, ownerKey) {
  const stored = await getMyVault(db, ownerKey);
  if (!stored) return { public_key: "" };
  return { public_key: stored.public_key };
}