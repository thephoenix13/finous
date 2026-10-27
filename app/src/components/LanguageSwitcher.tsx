import { useTranslation } from "react-i18next";
import { isLanguage, LANGUAGE_NAMES, LANGUAGES, setLanguage, type Language } from "../i18n";

/** Two-way toggle, one button per language. Each shows its own name and carries its own lang for screen readers. */
export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current: Language = isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "en";

  return (
    <div role="group" aria-label={t("language.label")} className="flex gap-1 rounded-btn bg-tint p-1">
      {LANGUAGES.map((lng) => {
        const active = lng === current;
        return (
          <button
            key={lng}
            type="button"
            lang={lng}
            aria-pressed={active}
            onClick={() => void setLanguage(i18n, lng)}
            className={`min-h-[44px] flex-1 rounded-[10px] px-3 text-[14px] font-medium ${
              active ? "bg-page text-ink shadow-card" : "text-ink-2"
            }`}
          >
            {LANGUAGE_NAMES[lng]}
          </button>
        );
      })}
    </div>
  );
}
