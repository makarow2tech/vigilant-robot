// Yerel karşılık: sayfalar yalnızca dosya yüklemeyi kullanır. Yükleme yerel sunucuya gider.
async function uploadFile(file) {
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

export const base44 = {
  integrations: {
    Core: {
      UploadPublicFile: ({ file }) => uploadFile(file),
    },
  },
};
