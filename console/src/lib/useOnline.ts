import { useCallback, useEffect, useState } from "react";

/**
 * Connectivity for the offline screen. `retry` makes a real request to a path that never exists, because any HTTP
 * response (even 404) means the network is reachable, while only a thrown error means it is not.
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
