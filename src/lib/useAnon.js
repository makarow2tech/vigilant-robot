import { useEffect, useState } from "react";
import { anonSecretHash, getAnonIdentity } from "@/lib/anon";

export function useAnonHash() {
  const [hash, setHash] = useState("");
  useEffect(() => {
    anonSecretHash()
      .then(setHash)
      .catch(() => setHash(""));
  }, []);
  return hash;
}

// Bu tarayıcının anonim kimliği (gizli anahtar değil, yalnızca kimlik).
export function useAnonId() {
  const [id, setId] = useState("");
  useEffect(() => {
    try {
      setId(getAnonIdentity().id || "");
    } catch {
      setId("");
    }
  }, []);
  return id;
}

export function useAnonName() {
  const [name, setName] = useState("anon");
  useEffect(() => {
    try {
      setName(getAnonIdentity().name || "anon");
    } catch {
      setName("anon");
    }
  }, []);
  return name;
}