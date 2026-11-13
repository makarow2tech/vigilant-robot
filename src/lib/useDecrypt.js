import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { decryptText } from "@/lib/crypto";
import { getSessionPrivateKey } from "@/lib/vault";
import { useVaultVersion } from "@/lib/useVault";

// Şifreli kayıtları tarayıcıda çözer. Sunucu hiçbir zaman düz metni görmez.
export function useDecryptedPosts(posts) {
  const { user } = useAuth();
  const version = useVaultVersion();
  const [map, setMap] = useState({});

  useEffect(() => {
    let alive = true;
    const privateKeyJwk = user?.id ? getSessionPrivateKey(user.id) : null;

    (async () => {
      const entries = await Promise.all(
        (posts || []).map(async (post) => {
          try {
            const title = await decryptText(post.title_cipher, post.envelopes, {
              privateKeyJwk,
              field: "title",
            });
            let body = "";
            try {
              body = await decryptText(post.body_cipher, post.envelopes, { privateKeyJwk, field: "body" });
            } catch {
              body = "";
            }
            return [post.id, { title, body }];
          } catch (error) {
            console.error("[krypt] gönderi çözülemedi:", error?.message || error);
            return [post.id, { locked: true }];
          }
        })
      );
      if (alive) setMap(Object.fromEntries(entries));
    })();

    return () => {
      alive = false;
    };
  }, [posts, user?.id, version]);

  return map;
}

export function useDecryptedComments(comments) {
  const { user } = useAuth();
  const version = useVaultVersion();
  const [map, setMap] = useState({});

  useEffect(() => {
    let alive = true;
    const privateKeyJwk = user?.id ? getSessionPrivateKey(user.id) : null;

    (async () => {
      const entries = await Promise.all(
        (comments || []).map(async (comment) => {
          try {
            const text = await decryptText(comment.body_cipher, comment.envelopes, { privateKeyJwk });
            return [comment.id, { text }];
          } catch {
            return [comment.id, { locked: true }];
          }
        })
      );
      if (alive) setMap(Object.fromEntries(entries));
    })();

    return () => {
      alive = false;
    };
  }, [comments, user?.id, version]);

  return map;
}