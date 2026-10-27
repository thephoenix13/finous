import { useTranslation } from "react-i18next";
import { useApiData, type Api, type RequestOptions } from "../api";
import PlaceholderPage from "../components/PlaceholderPage";
import { Row, RowGroup } from "../components/ui";
import { inr } from "../lib/format";

const DocIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </svg>
);

/** What is left in the Section 80C limit, for the Tax row's subtitle. */
const loadRoom80C = async (api: Api, options: RequestOptions): Promise<number> => {
  const { section80C } = await api.getTaxSummary(options);
  return Math.max(0, section80C.limit - section80C.used);
};

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

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 3 3 5-6" />
  </svg>
);

const TargetIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r=".5" fill="currentColor" />
  </svg>
);

/** The Plans hub. One row per tool, in the prototype's order; rows are added as each M2 calculator lands. */
export default function Plans() {
  const { t } = useTranslation();
  // The Tax row shows what is left in 80C once that is known. Until then, or if it cannot be loaded, it describes the screen.
  const room = useApiData(loadRoom80C);
  const taxSubtitle = room.status === "ready" && room.data > 0 ? t("plans.tools.tax.left", { left: inr(room.data) }) : t("plans.tools.tax.subtitle");
  return (
    <>
      <PlaceholderPage domain="goal" eyebrow={t("pages.plans.eyebrow")} title={t("pages.plans.title")} note={t("pages.plans.note")} />
      <RowGroup className="mb-6">
        <Row to="/plans/tax" icon={<DocIcon />} title={t("plans.tools.tax.title")} subtitle={taxSubtitle} />
        <Row to="/plans/prepay" icon={<TrendIcon />} title={t("plans.tools.prepay.title")} subtitle={t("plans.tools.prepay.subtitle")} />
        <Row to="/plans/refinance" icon={<ChartIcon />} title={t("plans.tools.refinance.title")} subtitle={t("plans.tools.refinance.subtitle")} />
        <Row to="/plans/afford" icon={<CheckIcon />} title={t("plans.tools.afford.title")} subtitle={t("plans.tools.afford.subtitle")} />
        <Row to="/plans/goal-calc" icon={<TargetIcon />} title={t("plans.tools.goalCalc.title")} subtitle={t("plans.tools.goalCalc.subtitle")} />
        <Row to="/plans/emi" icon={<CalcIcon />} title={t("plans.tools.emi.title")} subtitle={t("plans.tools.emi.subtitle")} />
      </RowGroup>
    </>
  );
}
