import { useEffect, useState } from "react";
import { getAnonIdentity } from "@/lib/anon";
import { myState } from "@/lib/server-fns";

// Sayfadaki kayıtlar için "benim oyum / kaydettim mi" durumunu tek istekte getirir.
export function useMyState(ids = []) {
  const [state, setState] = useState({ votes: {}, saved: {} });
  const signature = ids.join(",");

  useEffect(() => {
    if (!signature) return;
    let alive = true;
    const voterKey = getAnonIdentity().id;
    if (!voterKey) return;

    myState({ data: { voterKey, ids: signature.split(",") } })
      .then((result) => {
        if (alive) setState({ votes: result.votes || {}, saved: result.saved || {} });
      })
      .catch(() => {
        /* durum bilgisi alınamazsa oylar sıfırdan başlar */
      });

    return () => {
      alive = false;
    };
  }, [signature]);

  return state;
}