import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher";
import PlaceholderPage from "../components/PlaceholderPage";

/** Placeholder hero until M7, plus the one real control this screen has so far: the language. */
export default function You() {
  const { t } = useTranslation();
  return (
    <>
      <PlaceholderPage eyebrow={t("pages.you.eyebrow")} title={t("pages.you.title")} note={t("pages.you.note")} />
      <section className="mx-4 mb-6">
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t("language.label")}</h2>
        <LanguageSwitcher />
      </section>
    </>
  );
}
