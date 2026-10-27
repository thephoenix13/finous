import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type ToastOptions = { duration?: number };
type ToastApi = { toast: (message: string, options?: ToastOptions) => void };

const ToastContext = createContext<ToastApi | null>(null);

type Props = {
  children: ReactNode;
  /** Default time on screen, in ms. */
  duration?: number;
};

/**
 * One short message at a time, announced politely to screen readers. A new toast replaces the current one.
 * Use for confirmations ("Goal created"), not for errors the user must act on.
 * The live region is always in the page, because screen readers only announce changes to a region that already exists.
 */
export function ToastProvider({ children, duration = 2400 }: Props) {
  const [current, setCurrent] = useState<{ id: number; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const counter = useRef(0);

  const toast = useCallback(
    (text: string, options?: ToastOptions) => {
      clearTimeout(timer.current);
      counter.current += 1;
      setCurrent({ id: counter.current, text });
      timer.current = setTimeout(() => setCurrent(null), options?.duration ?? duration);
    },
    [duration],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-24 z-50 mx-auto max-w-[448px]">
        {current ? (
          <div key={current.id} className="rounded-2xl bg-ink px-4 py-3 text-[13px] leading-snug text-white shadow-card">
            {current.text}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}
