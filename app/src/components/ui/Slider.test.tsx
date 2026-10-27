// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { inr } from "../../lib/format";
import { expectAccessible } from "../../test/a11y";
import Slider from "./Slider";

const base = { label: "Loan amount", min: 500_000, max: 15_000_000, step: 50_000 };

describe("Slider", () => {
  it("is a slider labelled by its text", () => {
    render(<Slider {...base} value={6_200_000} onChange={() => {}} />);
    expect(screen.getByRole("slider", { name: "Loan amount" })).toBeInTheDocument();
  });

  it("shows the value, formatted", () => {
    render(<Slider {...base} value={6_200_000} onChange={() => {}} format={inr} />);
    expect(screen.getByText("₹62,00,000")).toBeInTheDocument();
  });

  it("shows the raw value when no format is given", () => {
    render(<Slider label="Rate" min={6} max={14} step={0.1} value={8.9} onChange={() => {}} />);
    expect(screen.getByText("8.9")).toBeInTheDocument();
  });

  it("is read aloud as the formatted value, not a bare number", () => {
    render(<Slider {...base} value={6_200_000} onChange={() => {}} format={inr} />);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "₹62,00,000");
  });

  it("passes min, max and step to the input", () => {
    render(<Slider {...base} value={6_200_000} onChange={() => {}} />);
    const input = screen.getByRole("slider");
    expect(input).toHaveAttribute("min", "500000");
    expect(input).toHaveAttribute("max", "15000000");
    expect(input).toHaveAttribute("step", "50000");
  });

  it("reports changes as numbers", () => {
    const onChange = vi.fn();
    render(<Slider {...base} value={6_200_000} onChange={onChange} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "7500000" } });
    expect(onChange).toHaveBeenCalledWith(7_500_000);
  });

  it("is controlled: it shows what it is given", () => {
    const { rerender } = render(<Slider {...base} value={1_000_000} onChange={() => {}} format={inr} />);
    expect(screen.getByText("₹10,00,000")).toBeInTheDocument();
    rerender(<Slider {...base} value={2_000_000} onChange={() => {}} format={inr} />);
    expect(screen.getByText("₹20,00,000")).toBeInTheDocument();
  });

  it("sets the filled share of the track", () => {
    render(<Slider label="Prepay" min={0} max={200} value={50} onChange={() => {}} />);
    expect(screen.getByRole("slider").style.getPropertyValue("--pct")).toBe("25%");
  });

  it("does not divide by zero when min equals max", () => {
    render(<Slider label="Fixed" min={5} max={5} value={5} onChange={() => {}} />);
    expect(screen.getByRole("slider").style.getPropertyValue("--pct")).toBe("0%");
  });

  it("takes its accent from the domain", () => {
    const { container } = render(<Slider {...base} value={6_200_000} onChange={() => {}} domain="loan" />);
    expect(container.firstElementChild).toHaveAttribute("data-domain", "loan");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Slider {...base} value={6_200_000} onChange={() => {}} format={inr} />);
    await expectAccessible(container);
  });
});
