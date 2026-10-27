import { useCallback, useEffect, useState } from "react";

/**
 * Connectivity for the offline screen.
 * `retry` makes a real network request. It deliberately targets a path the service worker
 * does not precache, so a cached response can never make the app look online.
 * Any HTTP response (even 404) means the network is reachable; only a thrown error means offline.
 */
export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const retry = useCallback(async () => {
    try {
      await fetch(`/__ping?t=${Date.now()}`, { method: "HEAD", cache: "no-store" });
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, []);

  return { online, retry };
}
