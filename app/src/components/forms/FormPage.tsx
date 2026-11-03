import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { readFields, type Errors, type FieldSpec } from "../../lib/formFields";
import PageHeader from "../PageHeader";
import { Button, Field, Select, Switch, useToast } from "../ui";

type Values = Record<string, string | number | boolean | undefined>;

type Props = {
  title: string;
  intro?: string;
  backTo: string;
  /** Where to go once saved. */
  doneTo: string;
  /** The fields, or a function of what is typed so far for forms whose fields depend on a choice (the kind of account). */
  specs: readonly FieldSpec[] | ((raw: Record<string, string>) => readonly FieldSpec[]);
  /** What each field starts as, by key. A key that is missing starts blank (switches: off). */
  initial: Record<string, string>;
  /** Called with the checked values. Throw to say it could not be saved. */
  onSave(values: Values): Promise<void>;
  /** Present on an edit: removes the thing, after the person confirms. */
  onDelete?: () => Promise<void>;
  /** Something above the fields that depends on what is typed, such as the kind of account. */
  top?: (values: Record<string, string>, set: (key: string, value: string) => void) => ReactNode;
  saveLabel?: string;
  /** Text for the delete button. */
  deleteLabel?: string;
};

/**
 * One form for every "enter your details" screen. It labels each field from the catalog (`forms.field.<key>`), shows every problem at
 * once with the reason, keeps what was typed when a save fails, and only leaves the screen once the save has worked.
 */
export default function FormPage({ title, intro, backTo, doneTo, specs, initial, onSave, onDelete, top, saveLabel, deleteLabel }: Props) {
  const { t: translate } = useTranslation();
  // Field and option keys are built from the form definitions, so they cannot be checked one by one against the catalog here.
  const t = (key: string): string => translate(key as never);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [raw, setRaw] = useState<Record<string, string>>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (key: string, value: string) => {
    setRaw((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const rest = { ...prev };
      delete rest[key];
      return rest;
    });
  };

  const finish = async (work: () => Promise<void>) => {
    setBusy(true);
    setFailed(false);
    try {
      await work();
    } catch {
      setFailed(true);
      setBusy(false);
      return;
    }
    toast(t("forms.saved"));
    navigate(doneTo, { replace: true });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const read = readFields(active, raw);
    if (!read.ok) {
      setErrors(read.errors);
      const first = active.find((s) => read.errors[s.key]);
      if (first) document.getElementById(`field-${first.key}`)?.focus();
      return;
    }
    void finish(() => onSave(read.values));
  };

  const active = typeof specs === "function" ? specs(raw) : specs;
  const describe = (key: string) => (errors[key] ? t(`forms.errors.${errors[key]}`) : undefined);

  return (
    <>
      <PageHeader title={title} backTo={backTo} />
      <form onSubmit={submit} noValidate className="px-5 pb-10 pt-4">
        {intro && <p className="mb-5 max-w-[36ch] text-[15px] text-ink-2">{intro}</p>}
        <div className="space-y-5">
          {top?.(raw, set)}
          {active.map((spec) => {
            const id = `field-${spec.key}`;
            const label = t(`forms.field.${spec.key}.label`);
            const hint = spec.hint ? t(`forms.field.${spec.key}.hint`) : undefined;
            const error = describe(spec.key);
            if (spec.type === "select")
              return (
                <Select
                  key={spec.key}
                  id={id}
                  label={label}
                  hint={hint}
                  error={error}
                  placeholder={spec.required ? t("forms.chooseOne") : t("forms.notSure")}
                  options={(spec.options ?? []).map((value) => ({ value, label: t(`forms.options.${spec.key}.${value}`) }))}
                  value={raw[spec.key] ?? ""}
                  onChange={(e) => set(spec.key, e.target.value)}
                />
              );
            if (spec.type === "switch")
              return (
                <div key={spec.key} className="flex items-center justify-between gap-4">
                  <span className="text-[15px] text-ink">{label}</span>
                  <Switch label={label} checked={raw[spec.key] === "true"} onCheckedChange={(on) => set(spec.key, String(on))} />
                </div>
              );
            const numeric = spec.type === "rupees" || spec.type === "integer" || spec.type === "last4";
            return (
              <Field
                key={spec.key}
                id={id}
                label={label}
                hint={hint}
                error={error}
                icon={spec.type === "rupees" ? "₹" : undefined}
                type={spec.type === "month" ? "month" : "text"}
                inputMode={numeric ? "numeric" : spec.type === "percent" ? "decimal" : undefined}
                autoComplete="off"
                maxLength={spec.type === "last4" ? 4 : undefined}
                value={raw[spec.key] ?? ""}
                onChange={(e) => set(spec.key, e.target.value)}
              />
            );
          })}
        </div>

        {failed && (
          <p role="alert" className="mt-5 text-[13px] text-negative">
            {t("forms.saveFailed")}
          </p>
        )}

        <div className="mt-8 space-y-3">
          <Button type="submit" loading={busy}>
            {saveLabel ?? t("forms.save")}
          </Button>
          {onDelete &&
            (confirmDelete ? (
              <div role="group" aria-label={deleteLabel ?? t("forms.delete")} className="space-y-3 rounded-btn bg-tint p-4">
                <p className="text-[15px] text-ink">{t("forms.deleteSure")}</p>
                <Button type="button" variant="quiet" disabled={busy} onClick={() => void finish(onDelete)}>
                  {t("forms.deleteYes")}
                </Button>
                <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirmDelete(false)}>
                  {t("forms.deleteNo")}
                </Button>
              </div>
            ) : (
              <Button type="button" variant="quiet" disabled={busy} onClick={() => setConfirmDelete(true)}>
                {deleteLabel ?? t("forms.delete")}
              </Button>
            ))}
        </div>
      </form>
    </>
  );
}
