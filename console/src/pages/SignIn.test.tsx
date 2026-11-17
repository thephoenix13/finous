import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { createDemoAuth } from "../auth/demoAuth";
import { expectAccessible } from "../test/a11y";
import { renderConsole } from "../test/render";

beforeEach(() => sessionStorage.clear());

async function typeCredentials(email = "admin@demobank.example", password = "pw") {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Work email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Continue" }));
  return user;
}

describe("sign-in (I1.1) and second factor (I1.2)", () => {
  it("sends someone who is signed out to sign in, and shows the first step", async () => {
    const { container } = renderConsole({ as: null });
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("asks for a code after the password, then signs in and lands on the overview", async () => {
    renderConsole({ as: null });
    const user = await typeCredentials();
    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByText(/sent a 6-digit code to admin@demobank.example/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Code"), "123456");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });

  it("returns to the screen they were sent away from", async () => {
    renderConsole({ as: null, route: "/help" });
    const user = await typeCredentials();
    await user.type(await screen.findByLabelText("Code"), "123456");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: "Help" })).toBeInTheDocument();
  });

  it("asks for both fields before it tries", async () => {
    const auth = createDemoAuth({ session: null });
    renderConsole({ as: null, auth });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your work email and your password.");
    await user.type(screen.getByLabelText("Work email"), "admin@demobank.example");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your work email and your password.");
    expect(auth.calls.sent).toEqual([]);
  });

  it("says plainly when the email and password don't match, and does not say which was wrong", async () => {
    renderConsole({ as: null });
    await typeCredentials("who@nowhere.example");
    expect(await screen.findByRole("alert")).toHaveTextContent("That email and password don't match.");
    expect(screen.getByLabelText("Work email")).toHaveValue("who@nowhere.example");
  });

  it("says when sign-in can't be reached, and lets them try again", async () => {
    const auth = createDemoAuth({ session: null, failNext: { startSignIn: "unavailable" } });
    renderConsole({ as: null, auth });
    const user = await typeCredentials();
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't reach sign-in");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeInTheDocument();
  });

  it("rejects a code that isn't six digits without asking the server, and a wrong one with the server", async () => {
    renderConsole({ as: null });
    const user = await typeCredentials();
    const code = await screen.findByLabelText("Code");
    await user.type(code, "123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter the 6-digit code");
    await user.clear(code);
    await user.type(code, "000000");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText(/That code isn't right/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Overview" })).not.toBeInTheDocument();
  });

  it("keeps only digits in the code box", async () => {
    renderConsole({ as: null });
    const user = await typeCredentials();
    const code = await screen.findByLabelText("Code");
    await user.type(code, "1a2b3");
    expect(code).toHaveValue("123");
  });

  it("resends a code, tells them, and holds the button off for a while", async () => {
    const auth = createDemoAuth({ session: null });
    renderConsole({ as: null, auth });
    const user = await typeCredentials();
    await user.click(await screen.findByRole("button", { name: "Resend code" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("We sent you a new code."));
    expect(auth.calls.sent).toHaveLength(2);
    const held = screen.getByRole("button", { name: /Resend code in \d+s/ });
    expect(held).toBeDisabled();
  });

  it("says when a new code couldn't be sent", async () => {
    const auth = createDemoAuth({ session: null, failNext: { resendCode: "unavailable" } });
    renderConsole({ as: null, auth });
    const user = await typeCredentials();
    await user.click(await screen.findByRole("button", { name: "Resend code" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't send a new code");
    expect(screen.getByRole("button", { name: "Resend code" })).toBeEnabled();
  });

  it("skips the code on a device they asked to remember", async () => {
    const first = renderConsole({ as: null });
    const user = await typeCredentials();
    await user.click(await screen.findByLabelText(/Remember this device/));
    await user.type(screen.getByLabelText("Code"), "123456");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByRole("heading", { name: "Overview" });
    first.unmount();
    sessionStorage.clear();

    renderConsole({ as: null, auth: createDemoAuth({ session: null }) });
    await typeCredentials();
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });

  it("sends them back to the first step when they use a different email", async () => {
    renderConsole({ as: null });
    const user = await typeCredentials();
    await user.click(await screen.findByRole("link", { name: "Use a different email" }));
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("does not show the code step to someone who did not come through the first step", async () => {
    renderConsole({ as: null, route: "/sign-in/verify" });
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("sends someone who is already signed in straight on, away from the sign-in screens", async () => {
    renderConsole({ route: "/sign-in" });
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });

  it("offers a try-a-role list in the demo that fills in the email", async () => {
    renderConsole({ as: null });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Branch" }));
    expect(screen.getByLabelText("Work email")).toHaveValue("branch@demobank.example");
    expect(screen.getByText(/the code is 123456/)).toBeInTheDocument();
  });

  it("checks the code step is accessible too", async () => {
    const { container } = renderConsole({ as: null });
    await typeCredentials();
    await screen.findByRole("heading", { name: "Check your email" });
    await expectAccessible(container);
  });
});
