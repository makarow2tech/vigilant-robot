// Yerel API istemcisi — sayfalar bu işlevleri aynı imzayla çağırır.
async function call(name, payload) {
  const response = await fetch(`/api/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) throw new Error((body && body.error) || `İstek başarısız (${response.status})`);
  return body;
}

const arg = (options) => (options && options.data) || {};

export const getSiteConfig = () => call("config", {});
export const listTopics = () => call("topics", {});
export const listFeed = (options) => call("feed", arg(options));
export const getPost = (options) => call("post", arg(options));
export const listComments = (options) => call("comments", arg(options));
export const myState = (options) => call("my-state", arg(options));
export const listBookmarks = (options) => call("bookmarks", arg(options));
export const getMyVault = (options) => call("vault", arg(options));
export const getMyProfile = (options) => call("profile", arg(options));
export const createPost = (options) => call("post/create", arg(options));
export const deletePost = (options) => call("post/delete", arg(options));
export const createComment = (options) => call("comment/create", arg(options));
export const deleteComment = (options) => call("comment/delete", arg(options));
export const vote = (options) => call("vote", arg(options));
export const toggleBookmark = (options) => call("bookmark/toggle", arg(options));
export const createTopic = (options) => call("topic/create", arg(options));
export const saveMyVault = (options) => call("vault/save", arg(options));

// Ek dosya: ham gövde olarak gönderilir, sunucu uploads/ klasörüne yazar.
export async function uploadAttachment(file) {
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "content-type": file.type || "application/octet-stream",
      "x-file-name": encodeURIComponent(file.name || "dosya"),
    },
    body: file,
  });
  if (!response.ok) {
    let detail = null;
    try {
      detail = await response.json();
    } catch {
      detail = null;
    }
    throw new Error((detail && detail.error) || "Dosya yüklenemedi.");
  }
  return response.json();
}
