import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { useMemberData } from "../../api/memberContext";
import { LoadError, LoadingCard } from "../../components/DataState";
import FormPage from "../../components/forms/FormPage";
import { useMemberRead } from "../../components/forms/useMemberRead";
import NotFound from "../NotFound";
import { ACCOUNT_KINDS, accountDraft, accountInitial, accountSpecs, type AccountKind } from "../../lib/memberForms";

/** Adds an account of any of the five kinds, or edits one. The kind is chosen when adding and cannot change afterwards. */
export default function AccountForm() {
  const { t } = useTranslation();
  const { id } = useParams();
  const data = useMemberData()!;
  const read = useMemberRead();

  if (read.status === "loading") return <LoadingCard />;
  if (read.status === "error") return <LoadError onRetry={read.retry} />;

  const existing = id ? read.input.accounts.find((a) => a.id === id) : undefined;
  if (id && !existing) return <NotFound />;

  return (
    <FormPage
      title={t(existing ? "forms.account.editTitle" : "forms.account.newTitle")}
      intro={t("forms.account.intro")}
      backTo={existing ? `/accounts/${existing.id}` : "/accounts"}
      doneTo="/accounts"
      specs={(raw) => accountSpecs(existing?.kind ?? raw.kind ?? "", { choosingKind: !existing })}
      initial={existing ? accountInitial(existing) : {}}
      onSave={(values) => {
        const kind = (existing?.kind ?? values.kind) as AccountKind;
        if (!ACCOUNT_KINDS.includes(kind)) return Promise.reject(new Error("no kind"));
        return data.saveAccount(accountDraft(kind, values, existing?.id));
      }}
      onDelete={existing ? () => data.deleteAccount(existing.id) : undefined}
      deleteLabel={t("forms.account.deleteLabel")}
    />
  );
}
