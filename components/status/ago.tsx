"use client";

import { useEffect, useState } from "react";
import { duration } from "@/lib/format";

/** Live "pirms 2 h 5 min" / "pēc 40 min" relative to now; ticks every 30 s. */
export function Ago({ at, serverNow }: { at: string | null; serverNow: string }) {
  const [now, setNow] = useState(() => new Date(serverNow).getTime());
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  if (!at) return <>—</>;
  const diff = now - new Date(at).getTime();
  return <span suppressHydrationWarning>{diff >= 0 ? `pirms ${duration(diff)}` : `pēc ${duration(-diff)}`}</span>;
}
