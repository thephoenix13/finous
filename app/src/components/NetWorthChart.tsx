import { useTranslation } from "react-i18next";
import type { NetWorthHistory } from "../api";
import { formatMonthYear, inr, parseMonth } from "../lib/format";

const W = 320;
const H = 96;
const PAD = 6;

/**
 * A quiet line of net worth over the months. The drawing is decorative; the screen-reader label says where it started and
 * where it ended. Needs at least two points, otherwise it draws nothing.
 */
export default function NetWorthChart({ history, className }: { history: NetWorthHistory; className?: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const { points } = history;
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z`;
  const first = points[0];
  const last = points[points.length - 1];
  const from = formatMonthYear(parseMonth(first.month), lang);
  const to = formatMonthYear(parseMonth(last.month), lang);

  return (
    <figure className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t("home.chartLabel", { from, to, start: inr(first.value), end: inr(last.value) })}
        className="h-24 w-full text-brand"
        preserveAspectRatio="none"
      >
        <path d={area} fill="currentColor" opacity="0.08" />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="mt-1 flex justify-between text-[12px] text-ink-2">
        <span>{from}</span>
        <span>{to}</span>
      </figcaption>
      {history.sample && <p className="relative mt-2 text-[12px] text-ink-2">{t("home.chartSample")}</p>}
    </figure>
  );
}
