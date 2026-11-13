// KRYPT bağımsız sunucu: /api/* JSON uçları + dist/ statik dosyaları.
// Bağımlılık yok — yalnızca Node.js yerleşik modülleri.
import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as api from "./api.mjs";
import { ROOT_DIR, UPLOAD_DIR } from "./store.mjs";

const DIST = path.join(ROOT_DIR, "dist");
const PORT = Number(process.env.PORT || 3000);
const JSON_LIMIT = 4 * 1024 * 1024;
const UPLOAD_LIMIT = 15 * 1024 * 1024;

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
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
};

const httpError = (status, message) => Object.assign(new Error(message), { status });

function readBody(request, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(httpError(413, "Gönderilen veri çok büyük."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

const handlers = {
  config: () => ({ config: api.readConfig() }),
  topics: () => api.listTopics(),
  feed: (body) => api.listFeed(body),
  post: (body) => api.getPost(body.id),
  comments: (body) => api.listComments(body.postId),
  "my-state": (body) => api.myState(body),
  bookmarks: (body) => api.listBookmarks(body.voterKey),
  vault: (body) => api.getMyVault(body.ownerKey),
  profile: (body) => api.getMyProfile(body.ownerKey),
  "post/create": (body) => api.createPost(body),
  "post/delete": (body) => api.deletePost(body),
  "comment/create": (body) => api.createComment(body),
  "comment/delete": (body) => api.deleteComment(body),
  vote: (body) => api.vote(body),
  "bookmark/toggle": (body) => api.toggleBookmark(body),
  "topic/create": (body) => api.createTopic(body),
  "vault/save": (body) => api.saveMyVault(body),
};

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(payload ?? null));
}

async function handleUpload(request) {
  const rawName = decodeURIComponent(request.headers["x-file-name"] || "dosya");
  const type = request.headers["content-type"] || "application/octet-stream";
  const data = await readBody(request, UPLOAD_LIMIT);
  if (!data.length) throw httpError(400, "Boş dosya.");

  const ext = path.extname(rawName).slice(0, 12).replace(/[^.\w]/g, "") || "";
  const base = path.basename(rawName, path.extname(rawName)).slice(0, 60).replace(/[^\w.-]+/g, "-") || "dosya";
  const stored = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${base}${ext}`;

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, stored), data);
  return { file_url: `/uploads/${stored}`, attachment_name: rawName, attachment_type: type };
}

async function handleApi(request, response, name) {
  if (name === "upload") {
    sendJson(response, 200, await handleUpload(request));
    return;
  }
  const handler = handlers[name];
  if (!handler) throw httpError(404, "Bilinmeyen uç.");
  const raw = await readBody(request, JSON_LIMIT);
  let body = {};
  if (raw.length) {
    try {
      body = JSON.parse(raw.toString("utf8"));
    } catch {
      throw httpError(400, "Geçersiz JSON.");
    }
  }
  sendJson(response, 200, await handler(body));
}

async function serveFile(response, file, cacheControl) {
  const data = await fs.readFile(file);
  response.writeHead(200, {
    "content-type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
    "cache-control": cacheControl,
  });
  response.end(data);
}

async function handleStatic(response, pathname) {
  const decoded = decodeURIComponent(pathname);

  if (decoded.startsWith("/uploads/")) {
    const file = path.join(UPLOAD_DIR, path.basename(decoded));
    try {
      await serveFile(response, file, "public, max-age=31536000, immutable");
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("bulunamadı");
    }
    return;
  }

  const wanted = decoded === "/" || !path.extname(decoded) ? "/index.html" : decoded;
  const file = path.join(DIST, path.normalize(wanted));
  if (!file.startsWith(DIST)) {
    response.writeHead(403);
    response.end();
    return;
  }

  try {
    await serveFile(response, file, decoded.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache");
  } catch {
    try {
      await serveFile(response, path.join(DIST, "index.html"), "no-cache");
    } catch {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("Uygulama derlenmemiş. Önce derleme komutunu çalıştırın.");
    }
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url.pathname.slice(5).replace(/\/+$/, ""));
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
      response.end("yalnızca GET");
      return;
    }
    await handleStatic(response, url.pathname);
  } catch (error) {
    const status = error && error.status ? error.status : 500;
    if (status >= 500) console.error("[krypt]", error);
    if (!response.headersSent) sendJson(response, status, { error: (error && error.message) || "Sunucu hatası." });
    else response.end();
  }
});

await api.init();
server.listen(PORT, () => {
  console.log(`KRYPT çalışıyor -> http://localhost:${PORT}`);
});
