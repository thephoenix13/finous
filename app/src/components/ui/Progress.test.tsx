// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectAccessible } from "../../test/a11y";
import Progress from "./Progress";

const fill = (bar: HTMLElement) => bar.firstElementChild as HTMLElement;

describe("Progress", () => {
  it("is a progressbar named by its label, on a 0 to 100 scale", () => {
    render(<Progress value={63} label="Section 80C limit used" />);
    const bar = screen.getByRole("progressbar", { name: "Section 80C limit used" });
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuenow", "63");
  });

  it("fills to the value", () => {
    render(<Progress value={63} label="x" />);
    expect(fill(screen.getByRole("progressbar")).style.width).toBe("63%");
  });

  it("rounds the value it announces, but fills to the exact width", () => {
    render(<Progress value={62.67} label="x" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "63");
    expect(fill(bar).style.width).toBe("62.67%");
  });

  it.each([
    [0, "0", "0%"],
    [100, "100", "100%"],
    [-20, "0", "0%"],
    [140, "100", "100%"],
    [Number.NaN, "0", "0%"],
    [Number.POSITIVE_INFINITY, "100", "100%"],
    [Number.NEGATIVE_INFINITY, "0", "0%"],
  ])("holds %s to the ends of the bar", (value, now, width) => {
    render(<Progress value={value} label="x" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", now);
    expect(fill(bar).style.width).toBe(width);
  });

  it("reads out the text it is given instead of the percentage", () => {
    render(<Progress value={63} label="Section 80C limit used" valueText="₹94,000 of ₹1,50,000" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "₹94,000 of ₹1,50,000");
  });

  it("has no value text unless one is given", () => {
    render(<Progress value={63} label="x" />);
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuetext");
  });

  it("merges extra classes and takes its colour from the domain", () => {
    render(
      <div data-domain="tax">
        <Progress value={50} label="x" className="mt-5" />
      </div>,
    );
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveClass("mt-5");
    expect(bar).toHaveClass("bg-domain-ink/15");
    expect(fill(bar)).toHaveClass("bg-domain");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <Progress value={63} label="Used" valueText="₹94,000 of ₹1,50,000" />
        <Progress value={0} label="Empty" />
        <Progress value={100} label="Full" />
      </>,
    );
    await expectAccessible(container);
  });
});
