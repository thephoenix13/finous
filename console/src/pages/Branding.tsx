import { useState, type ChangeEvent, type FormEvent } from "react";
import { useApi } from "../api/context";
import type { Branding as BrandingData } from "../api/types";
import { useApiData } from "../api/useApiData";
import { normaliseHex } from "../lib/contrast";
import { useSaver } from "../lib/useSaver";
import { checkLogo, validateBranding, type BrandingErrors } from "../lib/validate";
import { Button, Field, PageHeader, TextArea } from "../ui";
import SaveBar from "../ui/SaveBar";
import { Async } from "../ui/States";
import { BrandingPreview } from "./PhonePreview";
import SettingsTabs from "./SettingsTabs";

const load = (api: ReturnType<typeof useApi>, options: { signal?: AbortSignal }) => api.branding(options);

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** A colour as text plus the browser's own picker. Either one changes the same value. */
function ColourField({ label, value, error, onChange }: { label: string; value: string; error?: string; onChange: (v: string) => void }) {
  const picked = normaliseHex(value) ?? "#000000";
  return (
    <div className="flex items-start gap-3">
      <Field label={label} value={value} error={error} onChange={(e) => onChange(e.target.value)} onBlur={() => onChange(normaliseHex(value) ?? value)} className="flex-1" />
      <input type="color" aria-label={`Pick ${label.toLowerCase()}`} value={picked} onChange={(e) => onChange(e.target.value.toUpperCase())} className="mt-7 h-11 w-14 cursor-pointer rounded-btn border border-line bg-surface p-1" />
    </div>
  );
}

function BrandingForm({ initial }: { initial: BrandingData }) {
  const api = useApi();
  const [values, setValues] = useState(initial);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<keyof BrandingErrors, boolean>>>({});
  const [attempted, setAttempted] = useState(false);
  const saver = useSaver();

  const errors = validateBranding(values);
  // Colour problems show at once, because the preview is right beside them. The rest wait until the field is left or Save is tried.
  const shown = (field: keyof BrandingErrors, always = false) => (always || attempted || touched[field] ? errors[field] : undefined);
  const set = <K extends keyof BrandingData>(key: K, value: BrandingData[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    saver.reset();
  };
  const touch = (field: keyof BrandingErrors) => setTouched((t) => ({ ...t, [field]: true }));

  async function chooseLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = checkLogo(file);
    setLogoError(problem);
    if (problem) return;
    try {
      set("logo", await readAsDataUrl(file));
    } catch {
      setLogoError("We couldn't read that file. Try another.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (Object.keys(errors).length > 0) return;
    await saver.run(() =>
      api.saveBranding({ ...values, name: values.name.trim(), brandColour: normaliseHex(values.brandColour) ?? values.brandColour, onBrandColour: normaliseHex(values.onBrandColour) ?? values.onBrandColour, disclaimer: values.disclaimer.trim() }),
    );
  }

  const blocked = Boolean(errors.brandColour || errors.onBrandColour);

  return (
    <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-[1fr_280px]">
      <div className="space-y-5">
        <Field label="Bank name" value={values.name} error={shown("name")} onChange={(e) => set("name", e.target.value)} onBlur={() => touch("name")} hint="Shown on the app's first screen and in its title." />

        <div>
          <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Logo</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex h-11 cursor-pointer items-center rounded-btn border border-line bg-surface px-5 text-[14px] font-medium focus-within:outline focus-within:outline-2 focus-within:outline-brand">
              {values.logo ? "Replace logo" : "Upload logo"}
              <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={chooseLogo} className="sr-only" />
            </label>
            {values.logo ? (
              <Button variant="quiet" onClick={() => set("logo", null)}>
                Remove logo
              </Button>
            ) : null}
          </div>
          <p className={logoError ? "mt-1.5 text-[13px] text-negative" : "mt-1.5 text-[13px] text-ink-3"} role={logoError ? "alert" : undefined}>
            {logoError ?? "PNG, JPEG or SVG, under 512 KB. A square logo with a clear background works best."}
          </p>
        </div>

        <ColourField label="Brand colour" value={values.brandColour} error={shown("brandColour", true)} onChange={(v) => set("brandColour", v)} />
        <ColourField label="Text colour on brand colour" value={values.onBrandColour} error={shown("onBrandColour", true)} onChange={(v) => set("onBrandColour", v)} />
        <p className="-mt-2 text-[13px] text-ink-3">A pair that is hard to read is blocked, so no customer is left squinting at your buttons.</p>

        <TextArea
          label="Disclaimer"
          value={values.disclaimer}
          error={shown("disclaimer")}
          onChange={(e) => set("disclaimer", e.target.value)}
          onBlur={() => touch("disclaimer")}
          hint="Shown under the main button. Offers must say who is offering them and use Learn more, never Apply."
        />

        <SaveBar state={saver.state} disabled={blocked} />
      </div>

      <BrandingPreview look={values} disclaimer={values.disclaimer} />
    </form>
  );
}

/** I7.1: the bank's name, logo, colours and disclaimer, with the customer app's first screen shown live. */
export default function Branding() {
  const result = useApiData(load);
  return (
    <>
      <PageHeader title="Branding and app" description="Make the customer app yours: your name, your logo, your colours." />
      <SettingsTabs />
      <Async result={result}>{(data) => <BrandingForm initial={data} />}</Async>
    </>
  );
}
