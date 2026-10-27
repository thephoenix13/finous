import { useTranslation } from "react-i18next";
import { useRegisterSW } from "virtual:pwa-register/react";

/** Finance app: never swap code under the user silently. Offer the update and let them choose. */
export default function UpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-[448px] items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-[13px] text-white shadow-card"
    >
      <span>{t("update.ready")}</span>
      <span className="flex gap-1">
        <button type="button" className="min-h-[44px] rounded-btn px-3 font-medium text-white/70" onClick={() => setNeedRefresh(false)}>
          {t("update.later")}
        </button>
        <button type="button" className="min-h-[44px] rounded-btn px-3 font-semibold text-white" onClick={() => updateServiceWorker(true)}>
          {t("update.reload")}
        </button>
      </span>
    </div>
  );
}
