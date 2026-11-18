// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { ApiProvider, createMockApi } from "../api";
import type { AuthClient } from "../auth/types";
import { createI18n, type Language } from "../i18n";
import { expectAccessible } from "../test/a11y";
import { createFakeAuth } from "../test/fakeAuth";
import { parseBranding, type BankBranding } from "./branding";
import type { BankLookup } from "./lookup";

const make = (over: Record<string, unknown> = {}): BankBranding =>
  parseBranding({
    id: "b1",
    subdomain: "seva",
    name: "Seva Co-operative Bank",
    install_name: "Seva Money",
    logo: "data:image/png;base64,iVBORw0KGgo=",
    brand_colour: "#0F6B4A",
    on_brand_colour: "#FFFFFF",
    disclaimer: "Seva Bank is regulated by the RBI. This is not investment advice.",
    english: true,
    hindi: true,
    advisor: "rules",
    ...over,
  })!;

const BANK_HOST = "seva.app.finous.site";

function open(route: string, { bank = make(), host = BANK_HOST, lng = "en", auth = null }: { bank?: BankBranding | null; host?: string; lng?: Language; auth?: AuthClient | null } = {}) {
  window.history.pushState({}, "", route);
  const lookup: BankLookup = async () => bank;
  return render(
    <I18nextProvider i18n={createI18n(lng)}>
      <ApiProvider api={createMockApi()}>
        <App authClient={auth} host={host} bankLookup={lookup} />
      </ApiProvider>
    </I18nextProvider>,
  );
}

const here = () => window.location.pathname;
const tabs = () => within(screen.getByRole("navigation", { name: /Main|मुख्य/ }));

let fetchSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchSpy = vi.fn(async () => {
    throw new Error("no network in tests");
  });
  vi.stubGlobal("fetch", fetchSpy);
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.pushState({}, "", "/");
  document.head.innerHTML = "";
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-tenant");
  document.title = "";
});

describe("a bank's address", () => {
  it("opens the app as that bank: its name, logo, disclaimer, colours and Powered by Finous", async () => {
    open("/");
    const banner = await screen.findByTestId("bank-bar");
    expect(within(banner).getByText("Seva Co-operative Bank")).toBeInTheDocument();
    expect(banner.querySelector("img")).toHaveAttribute("src", "data:image/png;base64,iVBORw0KGgo=");
    expect(screen.getByText("Seva Bank is regulated by the RBI. This is not investment advice.")).toBeInTheDocument();
    expect(screen.getByText("Powered by Finous")).toBeInTheDocument();
    expect(document.title).toBe("Seva Co-operative Bank");
    expect(document.documentElement.style.getPropertyValue("--brand")).toBe("#0F6B4A");
  });

  it("is accessible", async () => {
    const { container } = open("/");
    await screen.findByTestId("bank-bar");
    await expectAccessible(container);
  });

  it("has no logo image when the bank has none, and still shows its name", async () => {
    open("/", { bank: make({ logo: null }) });
    const banner = await screen.findByTestId("bank-bar");
    expect(banner.querySelector("img")).toBeNull();
    expect(within(banner).getByText("Seva Co-operative Bank")).toBeInTheDocument();
  });

  it("never places a logo into the page: it is an image and nothing else", async () => {
    // Even an SVG logo, the one format that can carry a script, is only ever the src of an <img>: nothing of it enters the page.
    open("/", { bank: make({ logo: "data:image/svg+xml;base64,AAAA" }) });
    const banner = await screen.findByTestId("bank-bar");
    expect(banner.querySelector("img")).toHaveAttribute("src", "data:image/svg+xml;base64,AAAA");
    expect(banner.querySelector("svg, script, object, embed, iframe")).toBeNull();
  });

  it("stays Finous blue, but still the bank's name, when the bank's colours do not read", async () => {
    open("/", { bank: make({ brand_colour: "#CFE8FF" }) });
    await screen.findByTestId("bank-bar");
    expect(document.documentElement.style.getPropertyValue("--brand")).toBe("");
    expect(screen.getByText("Powered by Finous")).toBeInTheDocument();
  });

  it("shows the bank on the sign-in page too, before anyone is signed in", async () => {
    const { client } = createFakeAuth();
    open("/", { auth: client });
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Finous" })).toBeInTheDocument();
    expect(within(screen.getByTestId("bank-bar")).getByText("Seva Co-operative Bank")).toBeInTheDocument();
    expect(screen.getByText("Powered by Finous")).toBeInTheDocument();
  });

  it("says the address is not available, and shows no app, when there is no live bank", async () => {
    open("/", { bank: null });
    expect(await screen.findByRole("heading", { name: "This address isn't available" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByText("Powered by Finous")).not.toBeInTheDocument();
  });
});

describe("Finous's own address", () => {
  it("looks exactly as it did: no bank bar, no footer, no colour changes, no lookup", async () => {
    const lookup = vi.fn<BankLookup>();
    window.history.pushState({}, "", "/");
    render(
      <I18nextProvider i18n={createI18n("en")}>
        <ApiProvider api={createMockApi()}>
          <App authClient={null} host="app.finous.site" bankLookup={lookup} />
        </ApiProvider>
      </I18nextProvider>,
    );
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByTestId("bank-bar")).not.toBeInTheDocument();
    expect(screen.queryByText("Powered by Finous")).not.toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue("--brand")).toBe("");
    expect(tabs().getAllByRole("link")).toHaveLength(4);
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe("the advisor setting", () => {
  it("off: no Advisor tab, and its address goes Home", async () => {
    open("/advisor", { bank: make({ advisor: "off" }) });
    await screen.findByTestId("bank-bar");
    await waitFor(() => expect(here()).toBe("/"));
    expect(tabs().queryByRole("link", { name: "Advisor" })).not.toBeInTheDocument();
    expect(tabs().getAllByRole("link").map((l) => l.textContent)).toEqual(["Home", "Plans", "You"]);
    // Three tabs share the bar between them, with no empty fourth column
    expect(screen.getByRole("navigation", { name: "Main" })).toHaveClass("grid-cols-3");
    expect(screen.getByRole("navigation", { name: "Main" })).not.toHaveClass("grid-cols-4");
  });

  it("rules: the Advisor works, says it is fixed rules, and sends nothing to the AI", async () => {
    open("/advisor", { bank: make({ advisor: "rules" }) });
    expect(await screen.findByText(/Answers are worked out from your figures by fixed rules/)).toBeInTheDocument();
    expect(screen.queryByText(/written by an AI model/)).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: "How much did I spend on food this month?" }));
    expect(await screen.findByText(/You spent .* on food and dining this month/)).toBeInTheDocument();
    // Not the "AI could not answer" apology: this is how it is meant to work here
    expect(screen.queryByText(/The AI could not answer/)).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ai: asks the AI, as on Finous's own address", async () => {
    open("/advisor", { bank: make({ advisor: "ai" }) });
    expect(await screen.findByText(/written by an AI model/)).toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: "How much did I spend on food this month?" }));
    await screen.findByText(/The AI could not answer/); // the stub network is down, so the rules answer
    expect(fetchSpy).toHaveBeenCalledWith("/api/advisor", expect.anything());
  });
});

describe("the language settings", () => {
  it("both: the switcher is there", async () => {
    open("/you", { bank: make() });
    expect(await screen.findByRole("group", { name: "Language" })).toBeInTheDocument();
  });

  it("English only: no switcher, and Hindi is not offered even if the person's browser asked for it", async () => {
    open("/you", { bank: make({ hindi: false }), lng: "hi" });
    await screen.findByTestId("bank-bar");
    expect(screen.queryByRole("group", { name: /Language|भाषा/ })).not.toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByText("Powered by Finous")).toBeInTheDocument();
  });

  it("Hindi only: no switcher, and the whole app, footer included, is in Hindi", async () => {
    open("/you", { bank: make({ english: false }), lng: "en" });
    expect(await screen.findByText("Finous द्वारा संचालित")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /Language|भाषा/ })).not.toBeInTheDocument();
    expect(document.documentElement.lang).toBe("hi");
  });
});
