import { useTranslation } from "react-i18next";
import { Button } from "./ui";

/** Stands in for a screen's content while it loads. Reduced-motion users get a still block (see index.css). */
export function LoadingCard() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" className="mx-4 mt-3 h-[200px] animate-pulse rounded-hero bg-tint">
      <span className="sr-only">{t("common.loading")}</span>
    </div>
  );
}

/** A load that failed: say so plainly and offer the retry. Announced as an alert. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="px-5 pt-16 text-center">
      <p className="mx-auto max-w-[30ch] text-ink-2">{t("common.loadError")}</p>
      <Button variant="ghost" className="mt-8" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </div>
  );
}
