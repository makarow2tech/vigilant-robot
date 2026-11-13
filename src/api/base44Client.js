// Platformdan bağımsız sürüm: yalnızca dosya yükleme köprüsü gerekir.
const BASE = import.meta.env.VITE_API_BASE || "";

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
  });
}

async function upload(file) {
  const data = await toBase64(file);
  const response = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: file.name, type: file.type, data }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Dosya yüklenemedi.");
  return body;
}

export const base44 = {
  integrations: {
    Core: {
      UploadPublicFile: ({ file }) => upload(file),
      UploadPrivateFile: ({ file }) => upload(file),
    },
  },
  auth: {
    hasToken: () => false,
    me: async () => null,
    logout: () => {},
    redirectToLogin: () => window.location.assign("/login"),
  },
  entities: {},
};

export default base44;