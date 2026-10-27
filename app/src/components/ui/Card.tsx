import type { ReactNode } from "react";
import { cx } from "./cx";

type Props = {
  /**
   * raised: white with a soft shadow (insights, look-at-this items). The default.
   * outline: white with a hairline border, no shadow.
   */
  variant?: "raised" | "outline";
  as?: "div" | "section" | "article";
  className?: string;
  children: ReactNode;
};

export default function Card({ variant = "raised", as: Tag = "div", className, children }: Props) {
  return (
    <Tag
      className={cx(
        "bg-surface p-5",
        variant === "raised" ? "rounded-[26px] shadow-card" : "rounded-card border border-line",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
