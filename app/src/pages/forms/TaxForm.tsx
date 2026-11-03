import { useTranslation } from "react-i18next";
import { useMemberData } from "../../api/memberContext";
import { LoadError, LoadingCard } from "../../components/DataState";
import FormPage from "../../components/forms/FormPage";
import { useMemberRead } from "../../components/forms/useMemberRead";
import { financialYear } from "../../derive/derive";
import { TAX_SPECS, taxDraft, taxInitial } from "../../lib/memberForms";

/** What the member states for this financial year about the things nobody else can tell us: PPF, ELSS, insurance, home loan interest. */
export default function TaxForm() {
  const { t } = useTranslation();
  const data = useMemberData()!;
  const read = useMemberRead();

  if (read.status === "loading") return <LoadingCard />;
  if (read.status === "error") return <LoadError onRetry={read.retry} />;

  const year = financialYear(read.input.asOf).label;
  return (
    <FormPage
      title={t("forms.tax.title")}
      intro={t("forms.tax.intro")}
      backTo="/plans/tax"
      doneTo="/plans/tax"
      specs={TAX_SPECS}
      initial={taxInitial(read.input.tax)}
      onSave={(values) => data.saveTax(year, taxDraft(values))}
    />
  );
}
