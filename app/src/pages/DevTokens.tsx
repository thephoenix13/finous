const SURFACES = [
  ["page", "bg-page"],
  ["surface", "bg-surface"],
  ["tint", "bg-tint"],
  ["line", "bg-line"],
  ["brand", "bg-brand"],
  ["brand-strong", "bg-brand-strong"],
  ["positive", "bg-positive"],
  ["warning", "bg-warning"],
  ["negative", "bg-negative"],
  ["gold", "bg-gold"],
];

const DOMAINS = ["home", "emi", "loan", "inv", "goal", "ai"];

/** Dev only (/dev/tokens). A visual check that the Daylight tokens map to Tailwind utilities. */
export default function DevTokens() {
  return (
    <div className="space-y-6 p-4">
      <h1 className="font-display text-[28px] tracking-tight">Daylight tokens</h1>

      <div className="grid grid-cols-5 gap-2">
        {SURFACES.map(([name, cls]) => (
          <div key={name} className="text-center">
            <div className={`h-12 rounded-btn border border-line ${cls}`} />
            <p className="mt-1 text-[10.5px] text-ink-3">{name}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <p className="text-ink">Ink: primary text</p>
        <p className="text-ink-2">Ink 2: secondary text</p>
        <p className="text-ink-3">Ink 3: tertiary text</p>
      </div>

      <div className="space-y-3">
        {DOMAINS.map((d) => (
          <div key={d} data-domain={d} className="relative overflow-hidden rounded-hero bg-domain-tint p-5 text-domain-ink">
            <div className="absolute -bottom-12 -right-8 h-[140px] w-[140px] rounded-full bg-domain opacity-20" />
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">{d}</p>
            <p className="relative mt-2 font-display text-[40px] leading-none tracking-tight">₹76.4L</p>
          </div>
        ))}
      </div>

      <div className="rounded-card bg-surface p-4 shadow-card">
        <p className="text-[13px] text-ink-2">Card on a surface, with the card shadow.</p>
        <button type="button" className="mt-3 h-[52px] w-full rounded-btn bg-brand font-medium text-on-brand shadow-brand">
          Primary button
        </button>
      </div>
    </div>
  );
}
