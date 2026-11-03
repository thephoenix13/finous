// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it } from "vitest";
import App from "../App";
import { ApiProvider, createMockApi } from "../api";
import type { AuthClient } from "../auth/types";
import type { MemberEnvFactory } from "../components/AccessGate";
import { createI18n, type Language } from "../i18n";
import { createFakeMember } from "../test/fakeMember";
import { ALICE, createFakeAuth } from "../test/fakeAuth";
import { expectAccessible } from "../test/a11y";

/** What a brand-new member sees first: Home, greeting them by nothing yet, with the prompt to add an account. */
const HOME = { level: 1, name: /^Good (morning|afternoon|evening)\.$/ } as const;

function open(route: string, client: AuthClient | null, lng: Language = "en", memberEnv: MemberEnvFactory = () => createFakeMember()) {
  window.history.pushState({}, "", route);
  return render(
    <I18nextProvider i18n={createI18n(lng)}>
      <ApiProvider api={createMockApi()}>
        <App authClient={client} memberEnv={memberEnv} />
      </ApiProvider>
    </I18nextProvider>,
  );
}
const here = () => window.location.pathname;
afterEach(() => window.history.pushState({}, "", "/"));

const typeEmail = async (email = "alice@example.com") => {
  await userEvent.type(await screen.findByLabelText("Email"), email);
  await userEvent.click(screen.getByRole("button", { name: "Send me a code" }));
};
const typeCode = async (code = "123456") => {
  await userEvent.type(await screen.findByLabelText("6-digit code"), code);
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
};

describe("a build with no sign-in settings", () => {
  it("is just the demo: no gate, no sign-in screen", async () => {
    open("/", null);
    expect(await screen.findByRole("heading", { level: 1, name: /Aarav|Good (morning|afternoon|evening)/ })).toBeInTheDocument();
  });

  it("sends /signin and /join to Home", async () => {
    open("/signin", null);
    await screen.findByRole("heading", { level: 1 });
    expect(here()).not.toBe("/signin");
  });
});

describe("a signed-out visitor", () => {
  it("is sent from any screen to the sign-in page, which also offers the demo", async () => {
    const { client } = createFakeAuth();
    open("/accounts", client);
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Finous" })).toBeInTheDocument();
    expect(here()).toBe("/signin");
    expect(screen.getByRole("button", { name: "Try the demo with sample data" })).toBeInTheDocument();
  });

  it("can open the demo from the sign-in page, and it stays on after a reload", async () => {
    const { client } = createFakeAuth();
    const first = open("/signin", client);
    await userEvent.click(await screen.findByRole("button", { name: "Try the demo with sample data" }));
    await waitFor(() => expect(here()).not.toBe("/signin"));
    expect(localStorage.getItem("finous.demo")).toBe("1");
    first.unmount();
    open("/accounts", client);
    expect(await screen.findByRole("heading", { level: 1, name: "Accounts" })).toBeInTheDocument();
  });

  it("can follow a /demo link straight into the demo", async () => {
    const { client } = createFakeAuth();
    open("/demo", client);
    await waitFor(() => expect(localStorage.getItem("finous.demo")).toBe("1"));
    await waitFor(() => expect(here()).toBe("/"));
  });
});

describe("signing in with an email code", () => {
  it("asks for the email, mails a code, then asks for it", async () => {
    const { client, calls } = createFakeAuth();
    open("/signin", client);
    await typeEmail("  Alice@Example.com ");
    expect(await screen.findByRole("heading", { level: 1, name: "Check your email" })).toBeInTheDocument();
    expect(calls.sent).toEqual(["alice@example.com"]);
    expect(screen.getByText("We sent a 6-digit code to alice@example.com. It works for 10 minutes.")).toBeInTheDocument();
    expect(screen.getByLabelText("6-digit code")).toHaveFocus();
  });

  it("does not send a code to something that is not an email", async () => {
    const { client, calls } = createFakeAuth();
    open("/signin", client);
    await typeEmail("not-an-email");
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(calls.sent).toEqual([]);
  });

  it("keeps the Sign in button off until all six digits are in, and accepts only digits", async () => {
    const { client } = createFakeAuth();
    open("/signin", client);
    await typeEmail();
    const field = await screen.findByLabelText("6-digit code");
    await userEvent.type(field, "12ab34");
    expect(field).toHaveValue("1234");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
    await userEvent.type(field, "56789");
    expect(field).toHaveValue("123456");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("says a wrong code did not work, and lets the person try again", async () => {
    const { client, calls } = createFakeAuth();
    open("/signin", client);
    await typeEmail();
    await typeCode("000000");
    expect(await screen.findByText("That code didn't work. Check it, or ask for a new one.")).toBeInTheDocument();
    expect(here()).toBe("/signin");
    await userEvent.clear(screen.getByLabelText("6-digit code"));
    await typeCode("123456");
    await waitFor(() => expect(here()).toBe("/join"));
    expect(calls.verified).toHaveLength(2);
  });

  it.each([
    ["rate_limited", "Too many attempts. Wait a few minutes and try again."],
    ["network", "We couldn't reach the server. Check your connection and try again."],
    ["unknown", "Something went wrong. Please try again."],
  ] as const)("says so when sending the code fails with %s", async (code, message) => {
    const { client } = createFakeAuth({ failNext: { sendCode: code } });
    open("/signin", client);
    await typeEmail();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Sign in to Finous" })).toBeInTheDocument();
  });

  it("can send a new code, and can go back to change the email", async () => {
    const { client, calls } = createFakeAuth();
    open("/signin", client);
    await typeEmail();
    await userEvent.click(await screen.findByRole("button", { name: "Send a new code" }));
    expect(await screen.findByText("A new code is on its way.")).toBeInTheDocument();
    expect(calls.sent).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Use a different email" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Finous" })).toBeInTheDocument();
  });
});

describe("joining the beta", () => {
  it("sends a new account to the beta terms after the code, and records consent only once the box is ticked", async () => {
    const { client, calls, isConsented } = createFakeAuth();
    open("/signin", client);
    await typeEmail();
    await typeCode();
    expect(await screen.findByRole("heading", { level: 1, name: "Join the Finous beta" })).toBeInTheDocument();
    const join = screen.getByRole("button", { name: "Join the beta" });
    expect(join).toBeDisabled();
    expect(calls.consentsRecorded).toBe(0);
    await userEvent.click(screen.getByRole("checkbox", { name: /I agree to take part in the Finous beta trial/ }));
    expect(join).toBeEnabled();
    await userEvent.click(join);
    expect(await screen.findByRole("heading", HOME)).toBeInTheDocument();
    expect(calls.consentsRecorded).toBe(1);
    expect(isConsented()).toBe(true);
  });

  it("states the terms in plain words, including that it is not advice and that data stays in India", async () => {
    const { client } = createFakeAuth({ session: ALICE });
    open("/join", client);
    expect(await screen.findByText(/Finous is in beta/)).toBeInTheDocument();
    expect(screen.getByText(/not investment, tax or legal advice/)).toBeInTheDocument();
    expect(screen.getByText(/stored in India/)).toBeInTheDocument();
  });

  it("sends a signed-in person who has not consented to the beta screen from anywhere", async () => {
    const { client } = createFakeAuth({ session: ALICE });
    open("/accounts", client);
    expect(await screen.findByRole("heading", { level: 1, name: "Join the Finous beta" })).toBeInTheDocument();
    expect(here()).toBe("/join");
  });

  it("lets the person decline, which signs them out", async () => {
    const { client, calls } = createFakeAuth({ session: ALICE });
    open("/join", client);
    await userEvent.click(await screen.findByRole("button", { name: "Not now, sign me out" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Finous" })).toBeInTheDocument();
    expect(calls.signedOut).toBe(1);
  });

  it("says so, and stays put, when the consent cannot be saved", async () => {
    const { client, isConsented } = createFakeAuth({ session: ALICE, failNext: { recordConsents: "network" } });
    open("/join", client);
    await userEvent.click(await screen.findByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Join the beta" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't save that. Please try again.");
    expect(isConsented()).toBe(false);
    expect(here()).toBe("/join");
    await userEvent.click(screen.getByRole("button", { name: "Join the beta" }));
    expect(await screen.findByRole("heading", HOME)).toBeInTheDocument();
  });

  it("sends someone who is not signed in away from the beta screen", async () => {
    const { client } = createFakeAuth();
    open("/join", client);
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Finous" })).toBeInTheDocument();
  });
});

describe("a beta member", () => {
  it("sees their own space on every screen, never the sample customer's figures", async () => {
    const { client } = createFakeAuth({ session: ALICE, consented: true });
    open("/accounts", client);
    expect(await screen.findByRole("heading", { name: "Add your first account" })).toBeInTheDocument();
    expect(screen.queryByText(/Aarav/)).not.toBeInTheDocument();
    expect(screen.queryByText(/₹/)).not.toBeInTheDocument();
    expect(screen.queryByText(/HDFC/)).not.toBeInTheDocument();
  });

  it("goes straight to Home, not to the demo's welcome steps", async () => {
    const { client } = createFakeAuth({ session: ALICE, consented: true });
    localStorage.removeItem("finous.firstRunDone"); // a first visit: the demo would be sent to /welcome
    open("/", client);
    expect(await screen.findByRole("heading", HOME)).toBeInTheDocument();
    expect(here()).toBe("/");
  });

  it("is sent to the welcome steps in the demo on a first visit, which a member never sees", async () => {
    localStorage.setItem("finous.demo", "1");
    localStorage.removeItem("finous.firstRunDone");
    const { client } = createFakeAuth({ session: ALICE, consented: true });
    open("/", client);
    await waitFor(() => expect(here()).toBe("/welcome"));
  });

  it("can open the demo, and can sign out", async () => {
    const { client, calls } = createFakeAuth({ session: ALICE, consented: true });
    const first = open("/you", client);
    await userEvent.click(await screen.findByRole("button", { name: /Explore the demo/ }));
    await waitFor(() => expect(localStorage.getItem("finous.demo")).toBe("1"));
    expect(await screen.findByRole("button", { name: /Leave the demo/ })).toBeInTheDocument();
    first.unmount();
    localStorage.removeItem("finous.demo");
    open("/you", client);
    await userEvent.click(await screen.findByRole("button", { name: /Sign out/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Finous" })).toBeInTheDocument();
    expect(calls.signedOut).toBe(1);
  });

  it("is signed out everywhere when signing out in another tab", async () => {
    const fake = createFakeAuth({ session: ALICE, consented: true });
    open("/", fake.client);
    await screen.findByRole("heading", HOME);
    await fake.client.signOut();
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Finous" })).toBeInTheDocument();
  });
});

describe("leaving the demo", () => {
  it("is a row on the You tab when sign-in exists, and goes to the sign-in page", async () => {
    const { client } = createFakeAuth();
    localStorage.setItem("finous.demo", "1");
    open("/you", client);
    await userEvent.click(await screen.findByRole("button", { name: /Leave the demo/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Finous" })).toBeInTheDocument();
    expect(localStorage.getItem("finous.demo")).toBeNull();
  });

  it("is not offered in a build with no sign-in", async () => {
    open("/you", null);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("button", { name: /Leave the demo/ })).not.toBeInTheDocument();
  });
});

describe("while finding out who is signed in", () => {
  it("shows the brand, not the sign-in page or the demo", async () => {
    const never = { ...createFakeAuth().client, getSession: () => new Promise<never>(() => {}) };
    open("/", never);
    expect(await screen.findByRole("status", { name: "Finous" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("falls back to signed out if the session cannot be read", async () => {
    const broken = { ...createFakeAuth().client, getSession: () => Promise.reject(new Error("storage")) };
    open("/", broken);
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Finous" })).toBeInTheDocument();
  });

  it("treats a failure to read consent as 'not consented', never as 'allowed in'", async () => {
    const client = { ...createFakeAuth({ session: ALICE, consented: true }).client, hasConsents: () => Promise.reject(new Error("db")) };
    open("/", client);
    expect(await screen.findByRole("heading", { level: 1, name: "Join the Finous beta" })).toBeInTheDocument();
  });
});

describe("Hindi and accessibility", () => {
  it("is translated on the sign-in, code and beta screens", async () => {
    const { client } = createFakeAuth();
    open("/signin", client, "hi");
    expect(await screen.findByRole("heading", { level: 1, name: "Finous में साइन इन करें" })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("ईमेल"), "alice@example.com");
    await userEvent.click(screen.getByRole("button", { name: "मुझे कोड भेजें" }));
    expect(await screen.findByRole("heading", { level: 1, name: "अपना ईमेल देखें" })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("6 अंकों का कोड"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "साइन इन करें" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Finous बीटा से जुड़ें" })).toBeInTheDocument();
  });

  it.each([
    ["/signin", {}, "en"],
    ["/signin", {}, "hi"],
    ["/join", { session: ALICE }, "en"],
    ["/join", { session: ALICE }, "hi"],
    ["/", { session: ALICE, consented: true }, "en"],
    ["/", { session: ALICE, consented: true }, "hi"],
  ] as const)("%s (%j) has no accessibility violations in %s", async (route, options, lng) => {
    const { client } = createFakeAuth(options);
    const { container } = open(route, client, lng);
    await screen.findByRole("heading", { level: 1 });
    await expectAccessible(container);
  });

  it("the code field is announced as a one-time code and brings up the number pad", async () => {
    const { client } = createFakeAuth();
    open("/signin", client);
    await typeEmail();
    const field = await screen.findByLabelText("6-digit code");
    expect(field).toHaveAttribute("autocomplete", "one-time-code");
    expect(field).toHaveAttribute("inputmode", "numeric");
  });
});

