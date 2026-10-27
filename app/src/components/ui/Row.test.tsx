// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { expectAccessible } from "../../test/a11y";
import Tag from "./Tag";
import Row, { RowGroup } from "./Row";

describe("Row", () => {
  it("shows title, subtitle and the right-hand value", () => {
    render(<Row title="HDFC Bank" subtitle="Savings · •4821" right="₹2,84,000" />);
    expect(screen.getByText("HDFC Bank")).toBeInTheDocument();
    expect(screen.getByText("Savings · •4821")).toBeInTheDocument();
    expect(screen.getByText("₹2,84,000")).toBeInTheDocument();
  });

  it("is plain content with no role when it goes nowhere", () => {
    render(<Row title="Last updated" right="2 hours ago" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("is a real button when given onClick, and calls it", async () => {
    const onClick = vi.fn();
    render(<Row title="Linked accounts" onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "Linked accounts" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("works from the keyboard: Enter and Space", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Row title="Privacy" onClick={onClick} />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Privacy" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("is a real link when given `to`", () => {
    render(
      <MemoryRouter>
        <Row title="Tax" to="/plans/tax" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Tax" })).toHaveAttribute("href", "/plans/tax");
  });

  it("shows a chevron on rows that go somewhere, and hides it from assistive technology", () => {
    const { container } = render(<Row title="Tax" onClick={() => {}} />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("has no chevron on static rows unless asked", () => {
    const { container, rerender } = render(<Row title="Static" />);
    expect(container.querySelector("svg")).toBeNull();
    rerender(<Row title="Static" chevron />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("can hide the chevron on a tappable row", () => {
    const { container } = render(<Row title="Tap" onClick={() => {}} chevron={false} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("keeps the icon decorative", () => {
    const { container } = render(<Row title="Bank" icon={<svg data-testid="icon" />} />);
    expect(container.querySelector("[aria-hidden='true']")).toContainElement(screen.getByTestId("icon"));
  });

  it("takes a Tag as its right-hand content", () => {
    render(<Row title="Auto-pay" right={<Tag tone="warning">Off</Tag>} />);
    expect(screen.getByText("Off")).toBeInTheDocument();
  });

  it("has no accessibility violations across all three kinds", async () => {
    const { container } = render(
      <MemoryRouter>
        <RowGroup>
          <Row title="Static" subtitle="Plain" right="₹1" />
          <Row title="Button" onClick={() => {}} />
          <Row title="Link" to="/x" icon={<svg />} />
        </RowGroup>
      </MemoryRouter>,
    );
    await expectAccessible(container);
  });
});

describe("RowGroup", () => {
  it("puts dividers between rows", () => {
    const { container } = render(
      <RowGroup>
        <Row title="A" />
        <Row title="B" />
      </RowGroup>,
    );
    expect(container.firstElementChild).toHaveClass("divide-y");
  });
});
