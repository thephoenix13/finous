// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectAccessible } from "../../test/a11y";
import Switch from "./Switch";

describe("Switch", () => {
  it("is a switch with the setting's name", () => {
    render(<Switch label="Weekly summary" />);
    expect(screen.getByRole("switch", { name: "Weekly summary" })).toBeInTheDocument();
  });

  it("starts off", () => {
    render(<Switch label="A" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("starts on when defaultChecked is set at mount", () => {
    render(<Switch label="A" defaultChecked />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("toggles itself when uncontrolled, and reports the new value", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="A" onCheckedChange={onCheckedChange} />);
    const sw = screen.getByRole("switch");
    await userEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "true");
    await userEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(onCheckedChange.mock.calls).toEqual([[true], [false]]);
  });

  it("toggles with Space and Enter", async () => {
    const user = userEvent.setup();
    render(<Switch label="A" />);
    await user.tab();
    expect(screen.getByRole("switch")).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("when controlled, only follows the `checked` prop", async () => {
    const onCheckedChange = vi.fn();
    const { rerender } = render(<Switch label="A" checked={false} onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    rerender(<Switch label="A" checked onCheckedChange={onCheckedChange} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("does nothing when disabled", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="A" disabled onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("has no accessibility violations, on or off", async () => {
    const { container } = render(
      <>
        <Switch label="One" />
        <Switch label="Two" defaultChecked />
      </>,
    );
    await expectAccessible(container);
  });
});
