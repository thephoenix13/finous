import { useCallback, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useApi } from "../api/context";
import type { ConsoleApi, LanguageSettings, Product, RequestOptions } from "../api/types";
import { useApiData } from "../api/useApiData";
import { KIND_LABEL } from "../lib/labels";
import { EMPTY_PRODUCT, formFromProduct, formatTerm, parseProduct, type ProductErrors, type ProductForm } from "../lib/product";
import { useSaver } from "../lib/useSaver";
import { ROUTES } from "../routes";
import { Card, Field, PageHeader, Select, Switch, TextArea } from "../ui";
import SaveBar from "../ui/SaveBar";
import { Async } from "../ui/States";

type Loaded = { languages: LanguageSettings; product: Product | null };

/** How the product reads to a customer: the same facts, with Learn more and never Apply. */
function CustomerView({ form, disclosure }: { form: ProductForm; disclosure: string }) {
  const rate = Number(form.rate);
  const min = Number(form.tenureMin);
  const max = Number(form.tenureMax);
  return (
    <section aria-label="How it looks to a customer" className="self-start rounded-card border border-line bg-surface p-5 lg:sticky lg:top-8">
      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">How it looks to a customer</p>
      <h2 className="mt-3 font-display text-[22px] leading-tight">{form.name.trim() || "Product name"}</h2>
      <p className="mt-1 text-ink-2">
        {Number.isFinite(rate) && form.rate.trim() ? `${rate}% a year` : "Rate"}
        {Number.isInteger(min) && Number.isInteger(max) && min > 0 && max > 0 ? `, ${formatTerm(min)} to ${formatTerm(max)}` : ""}
      </p>
      <span className="mt-4 inline-flex h-11 items-center rounded-btn bg-tint px-5 text-[14px] font-medium">Learn more</span>
      <p className="mt-4 text-[12.5px] leading-snug text-ink-2">{disclosure.trim() || "Your disclosure appears here."}</p>
    </section>
  );
}

function EditorForm({ loaded }: { loaded: Loaded }) {
  const api = useApi();
  const navigate = useNavigate();
  const [form, setForm] = useState<ProductForm>(loaded.product ? formFromProduct(loaded.product) : EMPTY_PRODUCT);
  const [errors, setErrors] = useState<ProductErrors>({});
  const saver = useSaver();
  const hindi = loaded.languages.hindi;

  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    saver.reset();
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseProduct(form, { hindiRequired: hindi, id: loaded.product?.id });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    const ok = await saver.run(async () => {
      await api.saveProduct(parsed.draft);
    });
    if (ok) navigate(ROUTES.products, { state: { saved: parsed.draft.name } });
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-[1fr_300px]">
      <div className="space-y-5">
        <Field label="Product name" value={form.name} error={errors.name} onChange={(e) => set("name", e.target.value)} />
        <Select
          label="Type"
          value={form.kind}
          placeholder="Choose loan or deposit"
          options={[
            { value: "loan", label: KIND_LABEL.loan },
            { value: "deposit", label: KIND_LABEL.deposit },
          ]}
          error={errors.kind}
          onChange={(e) => set("kind", e.target.value as ProductForm["kind"])}
        />
        <Field label="Rate" inputMode="decimal" value={form.rate} error={errors.rate} onChange={(e) => set("rate", e.target.value)} suffix="% a year" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Shortest term" inputMode="numeric" value={form.tenureMin} error={errors.tenureMin} onChange={(e) => set("tenureMin", e.target.value)} suffix="months" />
          <Field label="Longest term" inputMode="numeric" value={form.tenureMax} error={errors.tenureMax} onChange={(e) => set("tenureMax", e.target.value)} suffix="months" />
        </div>
        <TextArea label="Who can have it" value={form.eligibility} error={errors.eligibility} onChange={(e) => set("eligibility", e.target.value)} rows={3} />
        <TextArea label="Fees" value={form.fees} error={errors.fees} onChange={(e) => set("fees", e.target.value)} rows={2} />
        <TextArea
          label="Disclosure in English"
          value={form.disclosureEn}
          error={errors.disclosureEn}
          onChange={(e) => set("disclosureEn", e.target.value)}
          hint="Says who is offering it. Use Learn more, never Apply."
          rows={3}
        />
        <TextArea
          label={hindi ? "Disclosure in Hindi" : "Disclosure in Hindi (optional)"}
          value={form.disclosureHi}
          error={errors.disclosureHi}
          onChange={(e) => set("disclosureHi", e.target.value)}
          hint={hindi ? "Your app is in Hindi too, so customers will read this." : "Your app is English only for now. Add it when you turn Hindi on."}
          rows={3}
          lang="hi"
        />
        <Card className="flex items-center justify-between gap-6">
          <div>
            <p className="font-medium">Show in the app</p>
            <p className="text-[13px] text-ink-3">{form.live ? "Live: customers see it as soon as you save." : "Draft: customers don't see it yet."}</p>
          </div>
          <Switch label="Show in the app" checked={form.live} onCheckedChange={(live) => set("live", live)} />
        </Card>
        <SaveBar state={saver.state} label={loaded.product ? "Save product" : "Add product"} />
      </div>
      <CustomerView form={form} disclosure={form.disclosureEn} />
    </form>
  );
}

/** I5.2: add a product or change one, with how it will read to a customer beside the form. */
export default function ProductEditor() {
  const { id } = useParams();
  const load = useCallback(
    async (api: ConsoleApi, options: RequestOptions): Promise<Loaded> => {
      const [languages, product] = await Promise.all([api.languages(options), id ? api.product(id, options) : Promise.resolve(null)]);
      return { languages, product };
    },
    [id],
  );
  const result = useApiData(load);
  return (
    <>
      <PageHeader title={id ? "Edit product" : "Add a product"} description="What customers read about it, in your words." />
      <Async
        result={result}
        notFound={
          <div role="alert" className="py-8">
            <p className="text-[16px]">We can't find that product. It may have been removed.</p>
          </div>
        }
      >
        {(loaded) => <EditorForm key={id ?? "new"} loaded={loaded} />}
      </Async>
      <p className="mt-8 text-[14px]">
        <Link to={ROUTES.products} className="font-medium text-brand-strong underline underline-offset-2">
          Back to the products
        </Link>
      </p>
    </>
  );
}
