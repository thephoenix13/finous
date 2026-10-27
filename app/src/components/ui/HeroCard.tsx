import type { ReactNode } from "react";
import { cx } from "./cx";
import type { Domain } from "./domain";

type Props = {
  /** Small uppercase label, for example "Net worth". */
  eyebrow: string;
  /** The one big number. */
  value: ReactNode;
  /** One line under the number, for example the month's change. */
  caption?: ReactNode;
  domain?: Domain;
  /** "xl" for a score that is the whole point of the screen, "lg" for the Home net worth, "md" for result numbers on detail screens. */
  size?: "xl" | "lg" | "md";
  /** Where the text sits. Centered suits a single big number such as a score. Defaults to the start. */
  align?: "start" | "center";
  className?: string;
  /** Extra content under the caption, such as a split of principal, interest and total. */
  children?: ReactNode;
};

/** The tinted card at the top of a screen. Takes its colours from the nearest `data-domain`. */
const SIZES = { xl: "text-[88px]", lg: "text-[52px]", md: "text-[44px]" } as const;

export default function HeroCard({ eyebrow, value, caption, domain, size = "lg", align = "start", className, children }: Props) {
  return (
    <section
      data-domain={domain}
      className={cx("relative overflow-hidden rounded-hero bg-domain-tint p-6 text-domain-ink", align === "center" && "text-center", className)}
    >
      <div aria-hidden="true" className="absolute -bottom-14 -right-10 h-[170px] w-[170px] rounded-full bg-domain opacity-20" />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">{eyebrow}</p>
        <p className={cx("mt-2 font-display leading-none tracking-tight tabular-nums", SIZES[size])}>
          {value}
        </p>
        {caption ? <p className="mt-3 text-[13px] font-medium">{caption}</p> : null}
        {children}
      </div>
    </section>
  );
}
