import { useEffect, useState } from "react";
import { anonSecretHash, getAnonIdentity } from "@/lib/anon";

export function useAnonHash() {
  const [hash, setHash] = useState(null);
  useEffect(() => {
    anonSecretHash()
      .then(setHash)
      .catch(() => setHash(""));
  }, []);
  return hash;
}

// Bu tarayıcının anonim kimliği (gizli anahtar değil, yalnızca kimlik).
export function useAnonId() {
  const [id, setId] = useState(null);
  useEffect(() => {
    try {
      setId(getAnonIdentity().id);
    } catch {
      setId("");
    }
  }, []);
  return id;
}