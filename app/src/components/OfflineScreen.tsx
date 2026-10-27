import { useTranslation } from "react-i18next";

type Props = { onRetry: () => void };

/** Architecture v1.1: offline shows this screen. No cached balances, ever. */
export default function OfflineScreen({ onRetry }: Props) {
  const { t } = useTranslation();
  return (
    <div className="px-5 pt-20 text-center" role="alert">
      <div className="mb-6 flex justify-center text-ink" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m2 2 20 20" />
          <path d="M8.5 8.5a11 11 0 0 1 7 0" />
          <path d="M5 12a16 16 0 0 1 3-1.8" />
          <path d="M16 10.2a16 16 0 0 1 3 1.8" />
          <path d="M8.5 16a6 6 0 0 1 7 0" />
          <circle cx="12" cy="20" r=".5" fill="currentColor" />
        </svg>
      </div>
      <h1 className="font-display text-[22px] leading-tight tracking-tight">{t("offline.title")}</h1>
      <p className="mx-auto mt-3 max-w-[30ch] text-ink-2">{t("offline.body")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-12 h-[52px] w-full rounded-btn bg-brand font-medium text-on-brand shadow-brand active:opacity-85"
      >
        {t("offline.retry")}
      </button>
    </div>
  );
}
