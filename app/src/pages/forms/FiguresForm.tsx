import { useTranslation } from "react-i18next";
import { useMemberData } from "../../api/memberContext";
import { LoadError, LoadingCard } from "../../components/DataState";
import FormPage from "../../components/forms/FormPage";
import { useMemberRead } from "../../components/forms/useMemberRead";
import { formatMonthYear, parseMonth } from "../../lib/format";
import { FIGURES_SPECS, figuresDraft, figuresInitial } from "../../lib/memberForms";

/** What the member earns and spends in a month, entered once. It is saved against the current month; entering it again that month replaces it. */
export default function FiguresForm() {
  const { t, i18n } = useTranslation();
  const data = useMemberData()!;
  const read = useMemberRead();

  if (read.status === "loading") return <LoadingCard />;
  if (read.status === "error") return <LoadError onRetry={read.retry} />;

  const { input } = read;
  const month = input.asOf.slice(0, 7);
  // This month's figures if they were entered, otherwise last time's as a starting point.
  const latest = input.monthly.find((m) => m.month === month) ?? [...input.monthly].sort((a, b) => b.month.localeCompare(a.month))[0];

  return (
    <FormPage
      title={t("forms.figures.title")}
      intro={t("forms.figures.intro", { month: formatMonthYear(parseMonth(month), i18n.resolvedLanguage) })}
      backTo="/you"
      doneTo="/"
      specs={FIGURES_SPECS}
      initial={figuresInitial(latest)}
      onSave={(values) => data.saveMonthly(figuresDraft(month, values))}
    />
  );
}
