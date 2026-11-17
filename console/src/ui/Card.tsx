import type { ReactNode } from "react";
import { cx } from "../lib/cx";

type Props = { as?: "div" | "section" | "article"; className?: string; children: ReactNode };

/** A white panel with a hairline border. The console's basic container. */
export default function Card({ as: Tag = "div", className, children }: Props) {
  return <Tag className={cx("rounded-card border border-line bg-surface p-5", className)}>{children}</Tag>;
}
