import { useTranslation } from "react-i18next";
import { Link } from "react-router";

type Props = {
  title: string;
  /** Where Back goes. A fixed route, not history, so a deep link never sends the user out of the app. */
  backTo: string;
};

/** Back link and the screen's one h1, for screens that sit under a tab. */
export default function PageHeader({ title, backTo }: Props) {
  const { t } = useTranslation();
  return (
    <header className="flex items-center gap-1 px-2 pt-2">
      <Link to={backTo} aria-label={t("common.back")} className="flex size-11 items-center justify-center rounded-full text-ink active:bg-tint">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </Link>
      <h1 className="font-display text-[19px] leading-tight tracking-tight">{title}</h1>
    </header>
  );
}
