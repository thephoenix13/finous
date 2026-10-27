import { useTranslation } from "react-i18next";
import PlaceholderPage from "../components/PlaceholderPage";
import { Row, RowGroup } from "../components/ui";

const CalcIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
  </svg>
);

const TrendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </svg>
);

const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);

/** The Plans hub. One row per tool, in the prototype's order; rows are added as each M2 calculator lands. */
export default function Plans() {
  const { t } = useTranslation();
  return (
    <>
      <PlaceholderPage domain="goal" eyebrow={t("pages.plans.eyebrow")} title={t("pages.plans.title")} note={t("pages.plans.note")} />
      <RowGroup className="mb-6">
        <Row to="/plans/prepay" icon={<TrendIcon />} title={t("plans.tools.prepay.title")} subtitle={t("plans.tools.prepay.subtitle")} />
        <Row to="/plans/refinance" icon={<ChartIcon />} title={t("plans.tools.refinance.title")} subtitle={t("plans.tools.refinance.subtitle")} />
        <Row to="/plans/emi" icon={<CalcIcon />} title={t("plans.tools.emi.title")} subtitle={t("plans.tools.emi.subtitle")} />
      </RowGroup>
    </>
  );
}
