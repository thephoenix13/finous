import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { useMemberData } from "../../api/memberContext";
import { LoadError, LoadingCard } from "../../components/DataState";
import FormPage from "../../components/forms/FormPage";
import { useMemberRead } from "../../components/forms/useMemberRead";
import { GOAL_SPECS, goalDraft, goalInitial } from "../../lib/memberForms";
import NotFound from "../NotFound";

/** Adds a savings goal, or edits one. */
export default function GoalForm() {
  const { t } = useTranslation();
  const { id } = useParams();
  const data = useMemberData()!;
  const read = useMemberRead();

  if (read.status === "loading") return <LoadingCard />;
  if (read.status === "error") return <LoadError onRetry={read.retry} />;

  const existing = id ? read.input.goals.find((g) => g.id === id) : undefined;
  if (id && !existing) return <NotFound />;

  return (
    <FormPage
      title={t(existing ? "forms.goal.editTitle" : "forms.goal.newTitle")}
      intro={t("forms.goal.intro")}
      backTo={existing ? `/plans/goals/${existing.id}` : "/plans/goals"}
      doneTo="/plans/goals"
      specs={GOAL_SPECS}
      initial={goalInitial(existing)}
      onSave={(values) => data.saveGoal(goalDraft(values, existing?.id))}
      onDelete={existing ? () => data.deleteGoal(existing.id) : undefined}
      deleteLabel={t("forms.goal.deleteLabel")}
    />
  );
}
