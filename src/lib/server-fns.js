import { getAnonIdentity } from "@/lib/anon";

// Bu sürümde sunucu tarafı ayrı bir Node sürecidir (server/index.mjs).
// Aynı fonksiyon adları ve imzaları korunur; her çağrı POST /api/fn/<ad>.
const BASE = import.meta.env.VITE_API_BASE || "";

async function call(name, data) {
  const payload = { ...(data || {}), _key: getAnonIdentity().id };
  const response = await fetch(`${BASE}/api/fn/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!response.ok) {
    throw new Error((body && body.error) || "İstek başarısız oldu.");
  }
  return body;
}

const fn = (name) => (args) => call(name, args && args.data ? args.data : args);

export const getSiteConfig = fn("getSiteConfig");
export const saveSiteConfig = fn("saveSiteConfig");
export const getAdminState = fn("getAdminState");
export const listTopics = fn("listTopics");
export const createTopic = fn("createTopic");
export const deleteTopic = fn("deleteTopic");
export const listFeed = fn("listFeed");
export const getPost = fn("getPost");
export const createPost = fn("createPost");
export const deletePost = fn("deletePost");
export const listComments = fn("listComments");
export const createComment = fn("createComment");
export const deleteComment = fn("deleteComment");
export const vote = fn("vote");
export const myVotes = fn("myVotes");
export const toggleBookmark = fn("toggleBookmark");
export const listBookmarks = fn("listBookmarks");
export const getMyProfile = fn("getMyProfile");
export const saveMyProfile = fn("saveMyProfile");
export const getMyVault = fn("getMyVault");
export const saveMyVault = fn("saveMyVault");

// Yönetim paneli bu pakete dahil değildir.
export const adminOverview = async () => {
  throw new Error("Yönetim paneli bağımsız pakete dahil değil.");
};
export const adminSetUserRole = adminOverview;
export const adminSetPostFlags = adminOverview;