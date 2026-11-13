import { useEffect, useRef, useState } from "react";
import { decryptText } from "@/lib/crypto";
import { getSessionPrivateKey } from "@/lib/vault";
import { useVaultVersion } from "@/lib/useVault";

// Şifreli kayıtları tarayıcıda çözer. Sunucu hiçbir zaman düz metni görmez.
// Liste kimliği her render'da değişse bile yalnızca kayıt kümesi değişince yeniden çözülür.

function useDecryptedMap(records, decryptOne) {
  const version = useVaultVersion();
  const [map, setMap] = useState({});
  const listRef = useRef(records);
  listRef.current = records;
  const signature = (records || []).map((record) => record.id).join(",");

  useEffect(() => {
    let alive = true;
    const list = listRef.current || [];
    const privateKeyJwk = getSessionPrivateKey();

    (async () => {
      const entries = await Promise.all(
        list.map(async (record) => {
          try {
            return [record.id, await decryptOne(record, privateKeyJwk)];
          } catch (error) {
            return [record.id, { locked: true, error: error?.code || "DECRYPT_FAILED" }];
          }
        })
      );
      if (alive) setMap(Object.fromEntries(entries));
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, version]);

  return map;
}

export function useDecryptedPosts(posts) {
  return useDecryptedMap(posts, async (post, privateKeyJwk) => {
    const title = await decryptText(post.title_cipher, post.envelopes, { privateKeyJwk, field: "title" });
    const body = await decryptText(post.body_cipher, post.envelopes, { privateKeyJwk, field: "body" });
    return { title, body };
  });
}

export function useDecryptedComments(comments) {
  return useDecryptedMap(comments, async (comment, privateKeyJwk) => {
    const text = await decryptText(comment.body_cipher, comment.envelopes, { privateKeyJwk });
    return { text };
  });
}