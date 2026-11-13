import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// KRYPT bağımsız sunucusu: veri JSON dosyasında, yükleme dosyaları data/uploads.
const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DATA_DIR = join(ROOT, "data");
const DB_FILE = join(DATA_DIR, "db.json");
const UPLOAD_DIR = join(DATA_DIR, "uploads");
const DIST = join(ROOT, "dist");
const PORT = Number(process.env.PORT || 8787);
const MAX_BODY = 12 * 1024 * 1024;

const DEFAULT_CONFIG = {
  key: "main",
  site_name: "KRYPT",
  tagline: "Şifreli tartışma ağı",
  hero_title: "Tartışma burada şifrelenir.",
  hero_subtitle:
    "Gönderiler tarayıcında şifrelenir, anahtarınla sarılır. Sunucu yalnızca şifreli blokları saklar.",
  neon_hue: 183,
  neon2_hue: 295,
  glow: 60,
  default_sort: "hot",
  allow_anonymous: true,
  allow_private_posts: true,
  allow_attachments: true,
  allow_downvotes: true,
  allow_new_topics: true,
  max_post_length: 20000,
  community_rules: "1. Kişisel veri paylaşma.\n2. Şifreli içeriği izinsiz çözme.\n3. Spam ve manipülasyon yasak.",
  global_css: "",
  maintenance: false,
  maintenance_text: "Kısa bir bakım çalışması yapıyoruz.",
  announcement: "",
};

const EMPTY_DB = {
  config: {},
  topics: [],
  posts: [],
  comments: [],
  votes: [],
  bookmarks: [],
  vaults: {},
};

const now = () => new Date().toISOString();
const newId = () => randomUUID();

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
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

async function load() {
  try {
    const raw = await readFile(DB_FILE, "utf8");
    return { ...EMPTY_DB, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY_DB, topics: [], posts: [], comments: [], votes: [], bookmarks: [] };
  }
}

async function save(db) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

const handlers = {
  async getSiteConfig(_data, db) {
    return { config: { ...DEFAULT_CONFIG, ...(db.config || {}) }, persisted: Object.keys(db.config || {}).length > 0 };
  },
  async saveSiteConfig({ config }, db) {
    db.config = { ...(db.config || {}), ...(config || {}) };
    return { config: { ...DEFAULT_CONFIG, ...db.config } };
  },
  async getAdminState() {
    return { isAdmin: false, configuredEmail: null, email: null };
  },
  async listTopics(_data, db) {
    return [...db.topics].sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || "")));
  },
  async createTopic(data, db) {
    const slug = slugify(data.name);
    if (!slug) throw fail(400, "Geçerli bir topluluk adı girin.");
    if (db.topics.some((topic) => topic.slug === slug)) throw fail(400, "Bu isimde bir topluluk zaten var.");
    const topic = {
      id: newId(),
      created_date: now(),
      name: data.name,
      slug,
      description: data.description || "",
      accent: data.accent || "#7CF9FF",
      icon: data.icon || "#",
      custom_css: data.custom_css || "",
      custom_html: data.custom_html || "",
      rules: data.rules || "",
      is_private: Boolean(data.is_private),
      post_count: 0,
      member_count: 1,
      pinned: false,
    };
    db.topics.push(topic);
    return topic;
  },
  async deleteTopic({ id }, db) {
    db.topics = db.topics.filter((topic) => topic.id !== id);
    db.posts = db.posts.filter((post) => post.topic_id !== id);
    return { ok: true };
  },
  async listFeed(data, db) {
    const limit = Math.min(Number(data.limit) || 20, 50);
    const offset = Math.max(0, Number(data.cursor) || 0);
    const topic = data.topicSlug || data.topic || "";
    let items = db.posts.filter((post) => !post.is_removed);
    if (topic) items = items.filter((post) => post.topic_slug === topic);
    if (data.q) {
      const q = String(data.q).toLowerCase();
      items = items.filter(
        (post) =>
          String(post.topic_name || "").toLowerCase().includes(q) ||
          String(post.author_name || "").toLowerCase().includes(q)
      );
    }
    const sort = data.sort === "new" ? "new" : data.sort === "top" ? "top" : "hot";
    items = [...items].sort((a, b) => {
      if (sort === "new") return String(b.created_date || "").localeCompare(String(a.created_date || ""));
      if (sort === "top") return (b.score || 0) - (a.score || 0);
      return (b.score || 0) + (b.comment_count || 0) * 2 - ((a.score || 0) + (a.comment_count || 0) * 2);
    });
    const page = items.slice(offset, offset + limit);
    const hasMore = offset + limit < items.length;
    return { items: page, next_cursor: hasMore ? String(offset + limit) : null, has_more: hasMore };
  },
  async getPost({ id }, db) {
    return db.posts.find((post) => post.id === id) || null;
  },
  async createPost(data, db) {
    const post = {
      id: newId(),
      created_date: now(),
      updated_date: now(),
      topic_id: data.topic_id || "",
      topic_slug: data.topic_slug || "",
      topic_name: data.topic_name || "",
      title_cipher: data.title_cipher,
      body_cipher: data.body_cipher,
      envelopes: data.envelopes,
      visibility: data.visibility === "private" ? "private" : "public",
      flair: data.flair || "",
      attachment_url: data.attachment_url || "",
      attachment_name: data.attachment_name || "",
      attachment_type: data.attachment_type || "",
      author_id: data.anon_id || data._key || "",
      author_name: data.author_name || "Anon",
      is_anon: true,
      anon_secret_hash: data.anon_secret_hash || "",
      upvotes: 0,
      downvotes: 0,
      score: 0,
      comment_count: 0,
      is_pinned: false,
      is_locked: false,
      is_removed: false,
    };
    db.posts.push(post);
    if (post.topic_id) {
      const topic = db.topics.find((item) => item.id === post.topic_id);
      if (topic) topic.post_count = (topic.post_count || 0) + 1;
    }
    return post;
  },
  async deletePost({ id, anonSecretHash }, db) {
    const post = db.posts.find((item) => item.id === id);
    if (!post) throw fail(404, "Gönderi bulunamadı.");
    if (post.anon_secret_hash && post.anon_secret_hash !== anonSecretHash) {
      throw fail(403, "Bu gönderiyi silme yetkiniz yok.");
    }
    db.posts = db.posts.filter((item) => item.id !== id);
    db.comments = db.comments.filter((comment) => comment.post_id !== id);
    return { ok: true };
  },
  async listComments({ postId }, db) {
    return db.comments
      .filter((comment) => comment.post_id === postId && !comment.is_removed)
      .sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || "")));
  },
  async createComment(data, db) {
    const comment = {
      id: newId(),
      created_date: now(),
      post_id: data.post_id,
      parent_id: data.parent_id || "",
      body_cipher: data.body_cipher,
      envelopes: data.envelopes,
      visibility: data.visibility === "private" ? "private" : "public",
      author_id: data.anon_id || data._key || "",
      author_name: data.author_name || "Anon",
      is_anon: true,
      anon_secret_hash: data.anon_secret_hash || "",
      upvotes: 0,
      downvotes: 0,
      score: 0,
      depth: Number(data.depth) || 0,
      is_removed: false,
    };
    db.comments.push(comment);
    const post = db.posts.find((item) => item.id === data.post_id);
    if (post) post.comment_count = (post.comment_count || 0) + 1;
    return comment;
  },
  async deleteComment({ id, anonSecretHash }, db) {
    const comment = db.comments.find((item) => item.id === id);
    if (!comment) throw fail(404, "Yorum bulunamadı.");
    if (comment.anon_secret_hash && comment.anon_secret_hash !== anonSecretHash) {
      throw fail(403, "Bu yorumu silme yetkiniz yok.");
    }
    db.comments = db.comments.filter((item) => item.id !== id);
    const post = db.posts.find((item) => item.id === comment.post_id);
    if (post) post.comment_count = Math.max(0, (post.comment_count || 1) - 1);
    return { ok: true };
  },
  async vote({ targetType, targetId, voterKey, value }, db) {
    const target =
      targetType === "post"
        ? db.posts.find((item) => item.id === targetId)
        : db.comments.find((item) => item.id === targetId);
    if (!target) throw fail(404, "Kayıt bulunamadı.");
    const existing = db.votes.find(
      (item) => item.target_type === targetType && item.target_id === targetId && item.voter_key === voterKey
    );
    const prev = existing ? existing.value : 0;
    let upvotes = target.upvotes || 0;
    let downvotes = target.downvotes || 0;
    if (prev === 1) upvotes -= 1;
    if (prev === -1) downvotes -= 1;
    const next = prev === value ? 0 : value;
    if (next === 1) upvotes += 1;
    if (next === -1) downvotes += 1;
    upvotes = Math.max(0, upvotes);
    downvotes = Math.max(0, downvotes);
    if (existing) {
      if (next === 0) db.votes = db.votes.filter((item) => item !== existing);
      else existing.value = next;
    } else if (next !== 0) {
      db.votes.push({
        id: newId(),
        created_date: now(),
        target_type: targetType,
        target_id: targetId,
        voter_key: voterKey,
        value: next,
      });
    }
    target.upvotes = upvotes;
    target.downvotes = downvotes;
    target.score = upvotes - downvotes;
    return { upvotes, downvotes, score: upvotes - downvotes, myVote: next };
  },
  async myVotes({ voterKey, postId }, db) {
    return db.votes.filter((item) => item.voter_key === voterKey && (!postId || item.target_id === postId));
  },
  async toggleBookmark({ postId, voterKey }, db) {
    const existing = db.bookmarks.find((item) => item.post_id === postId && item.voter_key === voterKey);
    if (existing) {
      db.bookmarks = db.bookmarks.filter((item) => item !== existing);
      return { saved: false };
    }
    db.bookmarks.push({ id: newId(), created_date: now(), post_id: postId, voter_key: voterKey });
    return { saved: true };
  },
  async listBookmarks({ voterKey }, db) {
    const ids = db.bookmarks.filter((item) => item.voter_key === voterKey).map((item) => item.post_id);
    return db.posts.filter((post) => ids.includes(post.id));
  },
  async getMyProfile() {
    return null;
  },
  async saveMyProfile(data) {
    return data || {};
  },
  async getMyVault({ _key }, db) {
    const stored = (db.vaults || {})[_key];
    if (!stored) return null;
    return { vault: stored.vault, public_key: stored.public_key };
  },
  async saveMyVault({ _key, public_key, vault }, db) {
    if (!_key) throw fail(401, "Kasa için kimlik gerekli.");
    db.vaults = { ...(db.vaults || {}), [_key]: { public_key, vault, updated_date: now() } };
    return { ok: true };
  },
};

function readJson(request) {
  return new Promise((resolvePromise, rejectPromise) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        rejectPromise(fail(413, "İstek çok büyük."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolvePromise({});
      try {
        resolvePromise(JSON.parse(raw));
      } catch {
        rejectPromise(fail(400, "Geçersiz JSON."));
      }
    });
    request.on("error", rejectPromise);
  });
}

function json(response, status, body) {
  const payload = JSON.stringify(body ?? null);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  });
  response.end(payload);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function sendFile(response, filePath) {
  response.writeHead(200, {
    "content-type": MIME[extname(filePath).toLowerCase()] || "application/octet-stream",
    "access-control-allow-origin": "*",
  });
  createReadStream(filePath).pipe(response);
}

async function handleUpload(data) {
  const match = /^[^.]{0,60}\.?([A-Za-z0-9]{1,8})$/.exec(String(data.name || "dosya"));
  const ext = match && match[1] ? `.${match[1].toLowerCase()}` : "";
  const bytes = Buffer.from(String(data.data || ""), "base64");
  if (!bytes.length) throw fail(400, "Boş dosya.");
  if (bytes.length > 8 * 1024 * 1024) throw fail(413, "Dosya en fazla 8 MB olabilir.");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const fileName = `${newId()}${ext}`;
  await writeFile(join(UPLOAD_DIR, fileName), bytes);
  return { file_url: `/uploads/${fileName}` };
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://localhost:${PORT}`);

    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "GET,POST,OPTIONS",
      });
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname.startsWith("/api/fn/")) {
      const name = url.pathname.slice("/api/fn/".length);
      const handler = handlers[name];
      if (!handler) throw fail(404, "Bilinmeyen işlev.");
      const body = await readJson(request);
      const db = await load();
      const result = await handler(body, db);
      await save(db);
      json(response, 200, result ?? null);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/upload") {
      const body = await readJson(request);
      json(response, 200, await handleUpload(body));
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/uploads/")) {
      const name = url.pathname.slice("/uploads/".length);
      const filePath = join(UPLOAD_DIR, name.replace(/[^A-Za-z0-9._-]/g, ""));
      if (!existsSync(filePath)) throw fail(404, "Dosya bulunamadı.");
      sendFile(response, filePath);
      return;
    }

    if (request.method === "GET") {
      const relative = url.pathname.replace(/^\/+/, "");
      const candidate = join(DIST, relative);
      if (relative && existsSync(candidate)) {
        const info = await stat(candidate);
        if (info.isFile()) {
          sendFile(response, candidate);
          return;
        }
      }
      const indexFile = join(DIST, "index.html");
      if (existsSync(indexFile)) {
        sendFile(response, indexFile);
        return;
      }
      response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      response.end("KRYPT API çalışıyor. Arayüz için `npm run build` sonrası bu adresi açın.");
      return;
    }

    throw fail(404, "Bulunamadı.");
  } catch (error) {
    json(response, error.status || 500, { error: error.message || "Sunucu hatası." });
  }
});

server.listen(PORT, () => {
  console.log(`KRYPT API http://localhost:${PORT} adresinde çalışıyor.`);
});