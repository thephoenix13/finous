import { useState, type FormEvent } from "react";
import { useApi } from "../api/context";
import type { AdvisorMode, LanguageSettings } from "../api/types";
import { useApiData } from "../api/useApiData";
import { useSaver } from "../lib/useSaver";
import { Card, PageHeader, Switch } from "../ui";
import SaveBar from "../ui/SaveBar";
import { Async } from "../ui/States";
import SettingsTabs from "./SettingsTabs";

const load = (api: ReturnType<typeof useApi>, options: { signal?: AbortSignal }) => api.languages(options);

const ADVISOR: { value: AdvisorMode; label: string; body: string }[] = [
  { value: "off", label: "Off", body: "Customers don't see the advisor at all." },
  { value: "rules", label: "Fixed rules only", body: "Answers come from fixed rules about money. No AI provider is involved." },
  {
    value: "ai",
    label: "AI, with the customer's consent",
    body: "Customers can ask in their own words. With their consent, their figures are sent to an AI provider outside India to write the answer. Choose this only if your compliance team agrees.",
  },
];

function LanguageRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-[13px] text-ink-3">{hint}</p>
      </div>
      <Switch label={label} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function LanguagesForm({ initial }: { initial: LanguageSettings }) {
  const api = useApi();
  const [values, setValues] = useState(initial);
  const saver = useSaver();
  const none = !values.english && !values.hindi;
  const set = (patch: Partial<LanguageSettings>) => {
    setValues((v) => ({ ...v, ...patch }));
    saver.reset();
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (none) return;
    await saver.run(() => api.saveLanguages(values));
  }

  return (
    <form onSubmit={submit} className="max-w-[720px] space-y-8">
      <Card as="section">
        <h2 className="text-[16px] font-semibold">Languages</h2>
        <div className="mt-2 divide-y divide-line">
          <LanguageRow label="English" hint="Customers can use the app in English." checked={values.english} onChange={(english) => set({ english })} />
          <LanguageRow label="Hindi" hint="Customers can switch the whole app to Hindi." checked={values.hindi} onChange={(hindi) => set({ hindi })} />
        </div>
        {none ? (
          <p role="alert" className="mt-2 text-[13px] text-negative">
            Keep at least one language on.
          </p>
        ) : null}
      </Card>

      <fieldset>
        <legend className="mb-3 text-[16px] font-semibold">Advisor</legend>
        <div className="space-y-3">
          {ADVISOR.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-start gap-3 rounded-card border border-line bg-surface p-4 has-[:checked]:border-brand">
              <input type="radio" name="advisor" value={option.value} checked={values.advisor === option.value} onChange={() => set({ advisor: option.value })} className="mt-1 size-4" />
              <span>
                <span className="block font-medium">{option.label}</span>
                <span className="mt-0.5 block text-[13.5px] text-ink-2">{option.body}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <SaveBar state={saver.state} disabled={none} />
    </form>
  );
}

/** I7.3: which languages customers get, and what the advisor does. */
export default function Languages() {
  const result = useApiData(load);
  return (
    <>
      <PageHeader title="Branding and app" description="Decide what customers get: the languages, and how the advisor answers." />
      <SettingsTabs />
      <Async result={result}>{(data) => <LanguagesForm initial={data} />}</Async>
    </>
  );
}
