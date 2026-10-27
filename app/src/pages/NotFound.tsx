import { useTranslation } from "react-i18next";
import { ButtonLink } from "../components/ui";

/** Any address the app does not have. Without it an unknown URL is a blank page. */
export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="px-5 pt-16 text-center">
      <h1 className="font-display text-[24px] leading-tight tracking-tight">{t("notFound.title")}</h1>
      <p className="mx-auto mt-3 max-w-[30ch] text-ink-2">{t("notFound.body")}</p>
      <ButtonLink to="/" variant="ghost" fullWidth={false} className="mt-8">
        {t("notFound.home")}
      </ButtonLink>
    </div>
  );
}
