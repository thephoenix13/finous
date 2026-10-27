type Props = {
  eyebrow: string;
  title: string;
  note: string;
  domain?: string;
};

/** Stand-in for screens that arrive in later milestones. Shows the Daylight hero treatment. */
export default function PlaceholderPage({ eyebrow, title, note, domain }: Props) {
  return (
    <section data-domain={domain} className="relative m-4 mt-6 overflow-hidden rounded-hero bg-domain-tint p-6 text-domain-ink">
      <div
        aria-hidden="true"
        className="absolute -bottom-14 -right-10 h-[170px] w-[170px] rounded-full bg-domain opacity-20"
      />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">{eyebrow}</p>
        <h1 className="mt-3 font-display text-[28px] leading-[1.15] tracking-tight">{title}</h1>
        <p className="mt-4 max-w-[32ch] text-[13px] leading-relaxed opacity-80">{note}</p>
      </div>
    </section>
  );
}
