import { useEffect, useState } from "react";
import { subscribeVault } from "@/lib/vault";

export function useVaultVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeVault(() => setVersion((value) => value + 1)), []);
  return version;
}