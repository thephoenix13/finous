// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectAccessible } from "../../test/a11y";
import { ToastProvider, useToast } from "./Toast";

function Trigger({ message = "Goal created", duration }: { message?: string; duration?: number }) {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast(message, duration ? { duration } : undefined)}>
      go
    </button>
  );
}

describe("Toast", () => {
  it("has a polite live region in the page before anything is shown", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toBeEmptyDOMElement();
  });

  it("shows the message inside the live region", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "go" }));
    expect(screen.getByRole("status")).toHaveTextContent("Goal created");
  });

  it("goes away by itself", async () => {
    render(
      <ToastProvider duration={40}>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "go" }));
    expect(screen.getByText("Goal created")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Goal created")).not.toBeInTheDocument());
  });

  it("a per-toast duration overrides the default", async () => {
    render(
      <ToastProvider duration={10_000}>
        <Trigger duration={40} />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "go" }));
    await waitFor(() => expect(screen.queryByText("Goal created")).not.toBeInTheDocument(), { timeout: 1000 });
  });

  it("a new toast replaces the current one, and restarts the timer", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      function Two() {
        const { toast } = useToast();
        return (
          <>
            <button type="button" onClick={() => toast("First")}>one</button>
            <button type="button" onClick={() => toast("Second")}>two</button>
          </>
        );
      }
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <ToastProvider duration={1000}>
          <Two />
        </ToastProvider>,
      );
      await user.click(screen.getByRole("button", { name: "one" }));
      vi.advanceTimersByTime(800);
      await user.click(screen.getByRole("button", { name: "two" }));
      expect(screen.queryByText("First")).not.toBeInTheDocument();
      expect(screen.getByText("Second")).toBeInTheDocument();

      // 800ms after the second toast it is still there: the first toast's timer was cancelled.
      vi.advanceTimersByTime(800);
      expect(screen.getByText("Second")).toBeInTheDocument();
      vi.advanceTimersByTime(300);
      await waitFor(() => expect(screen.queryByText("Second")).not.toBeInTheDocument());
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not leave a timer running after it unmounts", async () => {
    const spy = vi.spyOn(globalThis, "clearTimeout");
    const { unmount } = render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "go" }));
    spy.mockClear();
    unmount();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("throws a clear error when used outside the provider", () => {
    // React reports the deliberate throw on console and as a window error event; keep the output clean.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const swallow = (e: ErrorEvent) => e.preventDefault();
    window.addEventListener("error", swallow);
    expect(() => render(<Trigger />)).toThrow("useToast must be used inside <ToastProvider>");
    window.removeEventListener("error", swallow);
    error.mockRestore();
  });

  it("has no accessibility violations while a toast is showing", async () => {
    const { container } = render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "go" }));
    await expectAccessible(container);
  });
});
