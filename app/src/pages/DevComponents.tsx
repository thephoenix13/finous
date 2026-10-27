import { useState } from "react";
import { inr } from "../lib/format";
import { Button, ButtonLink, Card, Field, HeroCard, Row, RowGroup, Slider, Switch, Tag, useToast } from "../components/ui";

const BankIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10 12 3l9 7" />
    <path d="M5 10v10M9 10v10M15 10v10M19 10v10M3 20h18" />
  </svg>
);

/** Dev only (/dev/components). Every shared component in one place, with live state. */
export default function DevComponents() {
  const { toast } = useToast();
  const [loan, setLoan] = useState(6_200_000);
  const [autopay, setAutopay] = useState(false);

  return (
    <div className="space-y-8 pb-8">
      <h1 className="px-4 pt-4 font-display text-[28px] tracking-tight">Components</h1>

      <div className="space-y-3 px-4">
        <HeroCard eyebrow="Net worth" value="₹76.4L" caption="Positive · ₹1,24,000 this month" />
        <HeroCard eyebrow="Monthly saving" value="₹1,523" domain="loan" size="md" caption="Refinance from 8.9% to 8.5%" />
      </div>

      <div className="space-y-3 px-4">
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Insight</p>
          <p className="mt-2 text-ink">Dining is 22% higher than your 6-month average. Nothing alarming, but worth a look.</p>
        </Card>
        <Card variant="outline">Outline card, no shadow.</Card>
      </div>

      <RowGroup>
        <Row icon={<BankIcon />} title="HDFC Bank" subtitle="Savings · •4821" right="₹2,84,000" onClick={() => toast("Opens account detail")} />
        <Row icon={<BankIcon />} title="Auto-pay" subtitle="ICICI Amazon Pay" right={<Tag tone="warning">Off</Tag>} onClick={() => toast("Opens card detail")} />
        <Row title="Last updated" right="2 hours ago" />
        <Row title="Consent" right={<Tag tone="positive">Active</Tag>} />
        <Row title="Revoked" right={<Tag tone="negative">Revoked</Tag>} />
      </RowGroup>

      <div className="space-y-4 px-4">
        <Field label="Goal name" defaultValue="Home upgrade" />
        <Field label="Amount" inputMode="numeric" error="Enter a number" defaultValue="abc" />
        <Field label="Notes" hint="Maturity date, co-owner, anything" placeholder="Optional" />
      </div>

      <div className="space-y-2 px-4" data-domain="loan">
        <Slider label="Loan amount" value={loan} min={500_000} max={15_000_000} step={50_000} onChange={setLoan} format={inr} />
        <Switch label="Auto-pay" checked={autopay} onCheckedChange={setAutopay} />
        <p className="text-[13px] text-ink-3">Auto-pay is {autopay ? "on" : "off"}.</p>
      </div>

      <div className="space-y-3 px-4">
        <Button onClick={() => toast("Goal created")}>Show a toast</Button>
        <Button variant="accent">Ask HDFC for a quote</Button>
        <Button variant="ghost" size="sm">See September recap</Button>
        <Button variant="ghost" domain="loan" size="sm">Ghost in the loan domain</Button>
        <Button variant="quiet">Not now</Button>
        <Button loading>Retry ICICI</Button>
        <Button disabled>Disabled</Button>
        <ButtonLink to="/plans" variant="ghost" size="sm">A link that looks like a button</ButtonLink>
      </div>
    </div>
  );
}
