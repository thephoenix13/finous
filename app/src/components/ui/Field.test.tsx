// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectAccessible } from "../../test/a11y";
import Field from "./Field";

describe("Field", () => {
  it("is a text box labelled by its visible label", () => {
    render(<Field label="Goal name" />);
    expect(screen.getByRole("textbox", { name: "Goal name" })).toBeInTheDocument();
  });

  it("accepts typing and reports it", async () => {
    const onChange = vi.fn();
    render(<Field label="Goal name" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Goal name"), "Home");
    expect(onChange).toHaveBeenCalledTimes(4);
    expect(screen.getByLabelText("Goal name")).toHaveValue("Home");
  });

  it("passes input attributes through", () => {
    render(<Field label="Amount" inputMode="numeric" placeholder="₹" defaultValue="3000000" />);
    const input = screen.getByLabelText("Amount");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("placeholder", "₹");
    expect(input).toHaveValue("3000000");
  });

  it("forwards its ref to the input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Field label="Name" ref={ref} />);
    expect(ref.current).toBe(screen.getByLabelText("Name"));
  });

  it("ties the hint to the input", () => {
    render(<Field label="Notes" hint="Maturity date, co-owner, anything" />);
    expect(screen.getByLabelText("Notes")).toHaveAccessibleDescription("Maturity date, co-owner, anything");
    expect(screen.getByLabelText("Notes")).not.toHaveAttribute("aria-invalid");
  });

  it("an error replaces the hint, marks the field invalid and is read with it", () => {
    render(<Field label="Amount" hint="In rupees" error="Enter a number" />);
    const input = screen.getByLabelText("Amount");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter a number");
    expect(screen.queryByText("In rupees")).not.toBeInTheDocument();
  });

  it("has no description when there is no hint or error", () => {
    render(<Field label="Name" />);
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-describedby");
  });

  it("keeps the icon decorative", () => {
    const { container } = render(<Field label="Search" icon={<svg data-testid="i" />} />);
    expect(container.querySelector("[aria-hidden='true']")).toContainElement(screen.getByTestId("i"));
  });

  it("gives every field its own id, so two labels never point at one input", () => {
    render(
      <>
        <Field label="One" />
        <Field label="Two" />
      </>,
    );
    expect(screen.getByLabelText("One")).not.toBe(screen.getByLabelText("Two"));
  });

  it("honours an explicit id", () => {
    render(<Field label="Name" id="goal-name" />);
    expect(screen.getByLabelText("Name")).toHaveAttribute("id", "goal-name");
  });

  it("can be disabled", () => {
    render(<Field label="Name" disabled />);
    expect(screen.getByLabelText("Name")).toBeDisabled();
  });

  it("has no accessibility violations, with and without an error", async () => {
    const { container } = render(
      <>
        <Field label="Name" hint="As on your Aadhaar" />
        <Field label="Amount" error="Enter a number" />
      </>,
    );
    await expectAccessible(container);
  });
});
