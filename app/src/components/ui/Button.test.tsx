// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { expectAccessible } from "../../test/a11y";
import Button, { ButtonLink } from "./Button";

describe("Button", () => {
  it("is a button named by its label", () => {
    render(<Button>Retry</Button>);
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("calls onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("works from the keyboard: Enter and Space", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Go</Button>);
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  describe("type", () => {
    it("defaults to button, so it never submits a form by accident", () => {
      const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <Button>Not submit</Button>
        </form>,
      );
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByRole("button")).toHaveAttribute("type", "button");
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("submits a form when type is submit", () => {
      const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <Button type="submit">Create goal</Button>
        </form>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Create goal" }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe("variants", () => {
    it.each([
      ["primary", "bg-brand"],
      ["accent", "bg-warning"],
      ["ghost", "bg-domain-tint"],
      ["quiet", "bg-tint"],
    ] as const)("%s uses %s", (variant, cls) => {
      render(<Button variant={variant}>x</Button>);
      expect(screen.getByRole("button")).toHaveClass(cls);
    });

    it("defaults to primary", () => {
      render(<Button>x</Button>);
      expect(screen.getByRole("button")).toHaveClass("bg-brand");
    });

    it("only primary and accent carry a coloured shadow", () => {
      const coloured = /(^|\s)shadow-(brand|\[)/;
      const { rerender } = render(<Button variant="primary">x</Button>);
      expect(screen.getByRole("button")).toHaveClass("shadow-brand");
      rerender(<Button variant="accent">x</Button>);
      expect(screen.getByRole("button").className).toMatch(coloured);
      rerender(<Button variant="ghost">x</Button>);
      expect(screen.getByRole("button").className).not.toMatch(coloured);
      rerender(<Button variant="quiet">x</Button>);
      expect(screen.getByRole("button").className).not.toMatch(coloured);
    });
  });

  describe("size and width", () => {
    it("is 52px tall by default and 44px when small", () => {
      const { rerender } = render(<Button>x</Button>);
      expect(screen.getByRole("button")).toHaveClass("h-[52px]");
      rerender(<Button size="sm">x</Button>);
      expect(screen.getByRole("button")).toHaveClass("h-11");
    });

    it("fills its container by default and can opt out", () => {
      const { rerender } = render(<Button>x</Button>);
      expect(screen.getByRole("button")).toHaveClass("w-full");
      rerender(<Button fullWidth={false}>x</Button>);
      expect(screen.getByRole("button")).not.toHaveClass("w-full");
    });

    it("merges extra classes", () => {
      render(<Button className="mt-3">x</Button>);
      expect(screen.getByRole("button")).toHaveClass("mt-3");
    });
  });

  describe("domain", () => {
    it("sets the domain so the ghost tint follows it", () => {
      render(
        <Button variant="ghost" domain="loan">
          x
        </Button>,
      );
      expect(screen.getByRole("button")).toHaveAttribute("data-domain", "loan");
    });
  });

  describe("icon", () => {
    it("shows the icon but keeps it out of the accessible name", () => {
      render(<Button icon={<svg data-testid="icon" />}>Set up auto-pay</Button>);
      expect(screen.getByTestId("icon")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Set up auto-pay" })).toBeInTheDocument();
      expect(screen.getByTestId("icon").closest("[aria-hidden='true']")).not.toBeNull();
    });
  });

  describe("disabled", () => {
    it("is disabled and ignores clicks", async () => {
      const onClick = vi.fn();
      render(
        <Button disabled onClick={onClick}>
          Go
        </Button>,
      );
      expect(screen.getByRole("button")).toBeDisabled();
      await userEvent.click(screen.getByRole("button"));
      expect(onClick).not.toHaveBeenCalled();
    });

    it("leaves the tab order", async () => {
      const user = userEvent.setup();
      render(<Button disabled>Go</Button>);
      await user.tab();
      expect(screen.getByRole("button")).not.toHaveFocus();
    });
  });

  describe("loading", () => {
    it("is busy, disabled, and keeps its label", () => {
      render(<Button loading>Retry ICICI</Button>);
      const b = screen.getByRole("button", { name: "Retry ICICI" });
      expect(b).toHaveAttribute("aria-busy", "true");
      expect(b).toBeDisabled();
    });

    it("blocks repeat taps", async () => {
      const onClick = vi.fn();
      render(
        <Button loading onClick={onClick}>
          Retry
        </Button>,
      );
      await userEvent.click(screen.getByRole("button"));
      expect(onClick).not.toHaveBeenCalled();
    });

    it("swaps the icon for a spinner that is hidden from assistive technology", () => {
      render(
        <Button loading icon={<svg data-testid="icon" />}>
          Retry
        </Button>,
      );
      expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
      expect(screen.getByRole("button").querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    });

    it("is not marked busy when it is not loading", () => {
      render(<Button>Retry</Button>);
      expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy");
    });
  });

  it("forwards its ref", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>x</Button>);
    expect(ref.current).toBe(screen.getByRole("button"));
  });

  it("passes other button attributes through", () => {
    render(
      <Button aria-label="Close" title="Close" data-testid="b">
        ×
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toHaveAttribute("title", "Close");
  });

  it("has no accessibility violations in any state", async () => {
    const { container } = render(
      <>
        <Button variant="primary">Primary</Button>
        <Button variant="accent">Accent</Button>
        <Button variant="ghost" domain="loan">
          Ghost
        </Button>
        <Button variant="quiet" size="sm">
          Quiet
        </Button>
        <Button icon={<svg />}>With icon</Button>
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
      </>,
    );
    await expectAccessible(container);
  });
});

describe("ButtonLink", () => {
  const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

  it("is a real link to the destination", () => {
    wrap(<ButtonLink to="/plans/refinance">Check refinance</ButtonLink>);
    expect(screen.getByRole("link", { name: "Check refinance" })).toHaveAttribute("href", "/plans/refinance");
  });

  it("is not a button", () => {
    wrap(<ButtonLink to="/x">Go</ButtonLink>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("looks the same as a Button of the same variant and size", () => {
    wrap(
      <>
        <Button variant="ghost" size="sm">
          b
        </Button>
        <ButtonLink to="/x" variant="ghost" size="sm">
          l
        </ButtonLink>
      </>,
    );
    expect(screen.getByRole("link").className).toBe(screen.getByRole("button").className);
  });

  it("supports the icon and domain props", () => {
    wrap(
      <ButtonLink to="/x" icon={<svg data-testid="icon" />} domain="goal" variant="ghost">
        Goal
      </ButtonLink>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("data-domain", "goal");
    expect(screen.getByTestId("icon").closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("has no accessibility violations", async () => {
    const { container } = wrap(<ButtonLink to="/x">Go</ButtonLink>);
    await expectAccessible(container);
  });
});
