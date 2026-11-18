// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../App";
import { ApiProvider, createMockApi } from "../api";
import type { AuthClient } from "../auth/types";
import { ToastProvider } from "../components/ui";
import { createI18n, type Language } from "../i18n";
import { expectAccessible } from "../test/a11y";
import { ALICE, createFakeAuth } from "../test/fakeAuth";
import { createFakeMember } from "../test/fakeMember";
import { forgetNotNow } from "./asked";
import { forgetSettled } from "./BankAsk";
import { forgetArrivals } from "./BankArrival";
import { parseBranding, type BankBranding } from "./branding";
import type { BankLookup } from "./lookup";

const bank: BankBranding = parseBranding({
  id: "b1",
  subdomain: "seva",
  name: "Seva Co-operative Bank",
  install_name: "Seva Money",
  logo: null,
  brand_colour: "#0F6B4A",
  on_brand_colour: "#FFFFFF",
  disclaimer: "Seva Bank is regulated by the RBI. This is not investment advice.",
  english: true,
  hindi: true,
  advisor: "rules",
})!;

const BANK_HOST = "seva.app.finous.site";

type Member = ReturnType<typeof createFakeMember>;

/** The whole app at an address, arriving by a link to `route`, with `auth` for sign-in and `member` for what a member sees. */
function arrive(
  route: string,
  { auth, member = createFakeMember(), host = BANK_HOST, lng = "en", at = bank }: { auth: AuthClient | null; member?: Member; host?: string; lng?: Language; at?: BankBranding },
  state?: unknown,
) {
  window.history.pushState(state === undefined ? {} : { usr: state, key: "arrival", idx: 0 }, "", route);
  const lookup: BankLookup = async () => at;
  const view = render(
    <I18nextProvider i18n={createI18n(lng)}>
      <ApiProvider api={createMockApi()}>
        <ToastProvider>
          <App authClient={auth} memberEnv={() => member} host={host} bankLookup={lookup} />
        </ToastProvider>
      </ApiProvider>
    </I18nextProvider>,
  );
  return { member, view };
}

const here = () => window.location.pathname + window.location.search;

const typeEmail = async (email = "alice@example.com") => {
  await userEvent.type(await screen.findByLabelText("Email"), email);
  await userEvent.click(screen.getByRole("button", { name: "Send me a code" }));
};
const typeCode = async (code = "123456") => {
  await userEvent.type(await screen.findByLabelText("6-digit code"), code);
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
};
const signIn = async (email?: string) => {
  await typeEmail(email);
  await typeCode();
};

beforeEach(() => {
  forgetSettled();
  forgetNotNow();
  forgetArrivals();
  window.localStorage.clear();
});
afterEach(() => {
  window.history.pushState({}, "", "/");
  document.head.innerHTML = "";
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-tenant");
});

describe("arriving by a link from the bank's app: a new customer", () => {
  it("signs in with the email code and accepts the beta terms, then lands on the screen the link pointed at", async () => {
    const { client, calls } = createFakeAuth();
    arrive("/accounts", { auth: client });
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Finous" })).toBeInTheDocument();
    expect(here()).toBe("/signin");
    await signIn();
    expect(await screen.findByRole("heading", { level: 1, name: "Join the Finous beta" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Join the beta" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Accounts" })).toBeInTheDocument();
    expect(here()).toBe("/accounts");
    expect(calls.consentsRecorded).toBe(1);
  });

  it("keeps the whole address the link had, query included", async () => {
    const { client } = createFakeAuth({ consented: true });
    arrive("/search?q=rent", { auth: client });
    await signIn();
    await waitFor(() => expect(here()).toBe("/search?q=rent"));
  });

  it("a link to the front door goes to the front door: the bank's question comes first", async () => {
    const { client } = createFakeAuth({ consented: true });
    arrive("/", { auth: client });
    await signIn();
    expect(await screen.findByRole("heading", { level: 1, name: "Sharing with Seva Co-operative Bank" })).toBeInTheDocument();
  });

  it("is told, on the sign-in screen, that it is the same account if they already use Finous, and that each bank's address asks once", async () => {
    const { client } = createFakeAuth();
    arrive("/signin", { auth: client });
    expect(await screen.findByText(/Already use Finous\? Sign in with the same email and it is the same account\. Nothing new is created\./)).toBeInTheDocument();
    expect(screen.getByText(/Each bank's app has an address of its own, so you sign in once on each\./)).toBeInTheDocument();
  });

  it("says none of that on Finous's own address, where the demo is still offered", async () => {
    const { client } = createFakeAuth();
    arrive("/signin", { auth: client, host: "app.finous.site" });
    await screen.findByLabelText("Email");
    expect(screen.queryByText(/Already use Finous/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Each bank's app has an address of its own/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try the demo with sample data" })).toBeInTheDocument();
  });

  it("says it only while asking for the email: once the code has been sent there is something else to read", async () => {
    const { client } = createFakeAuth();
    arrive("/signin", { auth: client });
    await typeEmail();
    await screen.findByRole("heading", { level: 1, name: "Check your email" });
    expect(screen.queryByText(/Already use Finous/)).not.toBeInTheDocument();
  });

  it("is not offered the made-up demo customer under the bank's name", async () => {
    const { client } = createFakeAuth();
    arrive("/signin", { auth: client });
    await screen.findByLabelText("Email");
    expect(screen.queryByRole("button", { name: /demo/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/made-up customer/)).not.toBeInTheDocument();
  });

  it("shows the bank on the sign-in screen, and the screen has no accessibility violations in English and Hindi", async () => {
    for (const lng of ["en", "hi"] as Language[]) {
      const { client } = createFakeAuth();
      const { view } = arrive("/signin", { auth: client, lng });
      await screen.findByTestId("bank-bar");
      await screen.findByLabelText(lng === "en" ? "Email" : "ईमेल");
      await expectAccessible(view.container);
      view.unmount();
    }
  });

  it("is in Hindi too", async () => {
    const { client } = createFakeAuth();
    arrive("/signin", { auth: client, lng: "hi" });
    expect(await screen.findByText(/पहले से Finous इस्तेमाल करते हैं\?/)).toBeInTheDocument();
    expect(screen.getByText(/हर बैंक के ऐप का अपना पता होता है/)).toBeInTheDocument();
  });
});

describe("arriving by a link from the bank's app: a returning customer", () => {
  it("who already accepted the beta terms goes straight in after the code: no terms again, no second account", async () => {
    const { client, calls } = createFakeAuth({ consented: true });
    arrive("/accounts", { auth: client });
    await signIn();
    expect(await screen.findByRole("heading", { level: 1, name: "Accounts" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Join the Finous beta" })).not.toBeInTheDocument();
    expect(calls.consentsRecorded).toBe(0);
    expect(calls.sent).toHaveLength(1);
  });

  it("is recognised by their email however it is typed: spaces and capitals make no second account", async () => {
    const { client, calls } = createFakeAuth({ consented: true });
    arrive("/accounts", { auth: client });
    await signIn("  Alice@Example.COM  ");
    await screen.findByRole("heading", { level: 1, name: "Accounts" });
    expect(calls.sent).toEqual(["alice@example.com"]);
    expect(calls.verified).toEqual([["alice@example.com", "123456"]]);
  });

  it("who is already signed in at this address is not asked again: the link opens straight on its screen", async () => {
    const { client, calls } = createFakeAuth({ session: ALICE, consented: true });
    arrive("/accounts", { auth: client });
    expect(await screen.findByRole("heading", { level: 1, name: "Accounts" })).toBeInTheDocument();
    expect(here()).toBe("/accounts");
    expect(calls.sent).toEqual([]);
  });

  it("who signed in but never accepted the terms is taken to them, then on to the link's screen", async () => {
    const { client } = createFakeAuth({ session: ALICE, consented: false });
    arrive("/you/data", { auth: client });
    expect(await screen.findByRole("heading", { level: 1, name: "Join the Finous beta" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Join the beta" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Your data" })).toBeInTheDocument();
    expect(here()).toBe("/you/data");
  });
});

describe("where a link is allowed to send someone after they sign in", () => {
  it.each(["//evil.example/steal", "https://evil.example", "/signin", "/join", "javascript:alert(1)"])("never follows %s: it goes Home", async (from) => {
    const { client } = createFakeAuth({ consented: true });
    arrive("/signin", { auth: client }, { from });
    await signIn();
    // Home is the front door of a bank's app, which puts its question to a new member first: that is where it ends up, and nowhere the link named
    expect(await screen.findByRole("heading", { level: 1, name: "Sharing with Seva Co-operative Bank" })).toBeInTheDocument();
    expect(here()).toBe("/you/bank");
    expect(window.location.hostname).toBe("localhost");
  });
});

describe("the bank's customers are recorded on arrival, and nothing is shared by it", () => {
  it("records a signed-in member's arrival at the bank once, and shares nothing", async () => {
    const { client } = createFakeAuth({ session: ALICE, consented: true });
    const { member } = arrive("/accounts", { auth: client });
    await screen.findByRole("heading", { level: 1, name: "Accounts" });
    await waitFor(() => expect(member.joined.has("b1")).toBe(true));
    expect(member.sharing.size).toBe(0);
  });

  it("records each bank on its own: arriving at a second bank is a second arrival", async () => {
    const { client } = createFakeAuth({ session: ALICE, consented: true });
    const member = createFakeMember();
    const first = arrive("/accounts", { auth: client, member });
    await screen.findByRole("heading", { level: 1, name: "Accounts" });
    await waitFor(() => expect(member.joined.has("b1")).toBe(true));
    first.view.unmount();
    const other = parseBranding({ id: "b2", subdomain: "kosh", name: "Kosh Bank", install_name: "Kosh", logo: null, brand_colour: "#0F6B4A", on_brand_colour: "#FFFFFF", disclaimer: "Kosh Bank is regulated by the RBI.", english: true, hindi: true, advisor: "rules" })!;
    arrive("/accounts", { auth: client, member, host: "kosh.app.finous.site", at: other });
    await waitFor(() => expect(member.joined.has("b2")).toBe(true));
    expect([...member.joined].sort()).toEqual(["b1", "b2"]);
  });

  it("joins no bank on Finous's own address", async () => {
    const { client } = createFakeAuth({ session: ALICE, consented: true });
    const { member } = arrive("/accounts", { auth: client, host: "app.finous.site" });
    await screen.findByRole("heading", { level: 1, name: "Accounts" });
    await new Promise((r) => setTimeout(r, 30));
    expect(member.joined.size).toBe(0);
  });

  it("joins no bank for someone in the demo", async () => {
    const { client } = createFakeAuth();
    localStorage.setItem("finous.demo", "1");
    const { member } = arrive("/accounts", { auth: client });
    await screen.findByRole("heading", { level: 1, name: "Accounts" });
    await new Promise((r) => setTimeout(r, 30));
    expect(member.joined.size).toBe(0);
  });

  it("asks the database once however many screens are opened", async () => {
    const { client } = createFakeAuth({ session: ALICE, consented: true });
    const member = createFakeMember();
    let joins = 0;
    const real = member.data.bankSharing;
    member.data.bankSharing = {
      ...real,
      join: async (id) => {
        joins += 1;
        await real.join(id);
      },
    };
    arrive("/accounts", { auth: client, member });
    await screen.findByRole("heading", { level: 1, name: "Accounts" });
    await userEvent.click(screen.getByRole("link", { name: "You" }));
    await screen.findByRole("heading", { level: 1 });
    await userEvent.click(screen.getByRole("link", { name: "Plans" }));
    await screen.findByRole("heading", { level: 1 });
    expect(joins).toBe(1);
  });

  it("does not bother the member when it could not record the arrival, and tries again at the next visit", async () => {
    const { client } = createFakeAuth({ session: ALICE, consented: true });
    const member = createFakeMember();
    member.failNext();
    const first = arrive("/accounts", { auth: client, member });
    expect(await screen.findByRole("heading", { level: 1, name: "Accounts" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 30));
    expect(member.joined.size).toBe(0);
    first.view.unmount();
    arrive("/accounts", { auth: client, member });
    await screen.findByRole("heading", { level: 1, name: "Accounts" });
    await waitFor(() => expect(member.joined.has("b1")).toBe(true));
  });
});
