// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectAccessible } from "../../test/a11y";
import Card from "./Card";
import HeroCard from "./HeroCard";
import Tag from "./Tag";

describe("HeroCard", () => {
  it("shows the eyebrow, the number and the caption", () => {
    render(<HeroCard eyebrow="Net worth" value="₹76.4L" caption="Positive · ₹1,24,000 this month" />);
    expect(screen.getByText("Net worth")).toBeInTheDocument();
    expect(screen.getByText("₹76.4L")).toBeInTheDocument();
    expect(screen.getByText("Positive · ₹1,24,000 this month")).toBeInTheDocument();
  });

  it("omits the caption when there is none", () => {
    const { container } = render(<HeroCard eyebrow="Net worth" value="₹76.4L" />);
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("sets the domain so the accent changes", () => {
    const { container } = render(<HeroCard eyebrow="Monthly saving" value="₹1,523" domain="loan" />);
    expect(container.firstElementChild).toHaveAttribute("data-domain", "loan");
  });

  it("uses the smaller number size for detail screens", () => {
    render(<HeroCard eyebrow="Monthly EMI" value="₹58,345" size="md" />);
    expect(screen.getByText("₹58,345")).toHaveClass("text-[44px]");
  });

  it("renders extra content under the caption", () => {
    render(
      <HeroCard eyebrow="Monthly EMI" value="₹58,345">
        <p>Principal ₹62,00,000</p>
      </HeroCard>,
    );
    expect(screen.getByText("Principal ₹62,00,000")).toBeInTheDocument();
  });

  it("hides the decorative circle from assistive technology", () => {
    const { container } = render(<HeroCard eyebrow="Net worth" value="₹76.4L" />);
    expect(container.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<HeroCard eyebrow="Net worth" value="₹76.4L" caption="Up this month" />);
    await expectAccessible(container);
  });
});

describe("Card", () => {
  it("renders its children", () => {
    render(<Card>Dining is 22% higher than average.</Card>);
    expect(screen.getByText("Dining is 22% higher than average.")).toBeInTheDocument();
  });

  it("raised has a shadow and outline has a border", () => {
    const { rerender } = render(<Card>x</Card>);
    expect(screen.getByText("x")).toHaveClass("shadow-card");
    rerender(<Card variant="outline">x</Card>);
    expect(screen.getByText("x")).toHaveClass("border-line");
    expect(screen.getByText("x")).not.toHaveClass("shadow-card");
  });

  it("renders the element you ask for", () => {
    render(<Card as="article">x</Card>);
    expect(screen.getByRole("article")).toBeInTheDocument();
  });

  it("merges extra classes", () => {
    render(<Card className="mt-4">x</Card>);
    expect(screen.getByText("x")).toHaveClass("mt-4");
  });
});

describe("Tag", () => {
  it("shows its text", () => {
    render(<Tag tone="positive">Active</Tag>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it.each([
    ["neutral", "text-ink-2"],
    ["positive", "text-positive"],
    ["warning", "text-warning"],
    ["negative", "text-negative"],
  ] as const)("%s tone uses %s", (tone, cls) => {
    render(<Tag tone={tone}>Label</Tag>);
    expect(screen.getByText("Label")).toHaveClass(cls);
  });

  it("defaults to neutral", () => {
    render(<Tag>Label</Tag>);
    expect(screen.getByText("Label")).toHaveClass("text-ink-2");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Tag tone="warning">Off</Tag>);
    await expectAccessible(container);
  });
});
