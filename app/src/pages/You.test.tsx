// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import App from "../App";
import { ApiProvider, ApiError, createMockApi, type Api, type Consent } from "../api";
import { createI18n, type Language } from "../i18n";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import Consents from "./Consents";
import LinkedAccounts from "./LinkedAccounts";
import Privacy from "./Privacy";
import Profile from "./Profile";
import You from "./You";

function withConsents(change: (c: Consent[]) => Consent[]): Api {
  const base = createMockApi();
  return { ...base, listConsents: async (o) => change(await base.listConsents(o)) };
}
const expired = (c: Consent[]): Consent[] => c.map((x) => ({ ...x, status: "expired" }));

describe("You (prototype You)", () => {
  it("shows who the user is, with the one h1 being their name", async () => {
    renderWithI18n(<You />);
    expect(await screen.findByRole("heading", { level: 1, name: "Aarav Mehta" })).toBeInTheDocument();
    expect(screen.getByText("aarav.mehta@example.com")).toBeInTheDocument();
  });

  it("links to the four places, each with a live summary", async () => {
    renderWithI18n(<You />);
    await screen.findByRole("heading", { level: 1 });
    const link = (name: RegExp) => screen.getByRole("link", { name });
    expect(link(/Linked accounts/)).toHaveAttribute("href", "/you/linked");
    expect(link(/Linked accounts/)).toHaveTextContent("7 connections");
    expect(link(/Consent manager/)).toHaveAttribute("href", "/you/consents");
    expect(link(/Consent manager/)).toHaveTextContent("2 active · next expiry Sep 2027");
    expect(link(/Privacy and data/)).toHaveAttribute("href", "/you/privacy");
    expect(link(/Profile/)).toHaveAttribute("href", "/you/profile");
  });

  it("reports the earliest expiry among the active consents, not the latest or an expired one", async () => {
    const api = withConsents((c) => [
      { ...c[0], expiresOn: "2028-03-10" },
      { ...c[1], expiresOn: "2027-01-05" },
      { ...c[0], id: "old", status: "expired", expiresOn: "2026-10-01" },
    ]);
    renderWithI18n(<You />, { api });
    expect(await screen.findByText("2 active · next expiry Jan 2027")).toBeInTheDocument();
  });

  it("keeps the language switch on the screen", async () => {
    renderWithI18n(<You />);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
  });

  it("says when no consent is active", async () => {
    renderWithI18n(<You />, { api: withConsents(expired) });
    expect(await screen.findByText("No consents are active.")).toBeInTheDocument();
  });

  it("offers a retry when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<You />, { api });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Aarav Mehta" })).toBeInTheDocument();
  });
});

describe("LinkedAccounts (prototype linked accounts)", () => {
  it("lists every connection with what it is, active while the dashboard consent is", async () => {
    renderWithI18n(<LinkedAccounts />);
    await screen.findByText("HDFC Bank");
    expect(screen.getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(["/you", ...Array(7).fill("/you/consents")]);
    expect(screen.getAllByText("Active")).toHaveLength(7);
    for (const [name, what] of [
      ["HDFC Bank", "Savings · •4821"],
      ["HDFC Home Loan", "Home loan"],
      ["ICICI Amazon Pay", "On ₹3,00,000 limit"],
      ["Groww Mutual Funds", "Mutual funds"],
      ["PPF Account", "PPF"],
    ]) {
      expect(within(screen.getByRole("link", { name: new RegExp(name) })).getByText(what)).toBeInTheDocument();
    }
  });

  it("shows the consent's state when it is no longer active", async () => {
    renderWithI18n(<LinkedAccounts />, { api: withConsents(expired) });
    await screen.findByText("HDFC Bank");
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(screen.getAllByText("Expired")).toHaveLength(7);
  });

  it("treats a missing dashboard consent as revoked", async () => {
    renderWithI18n(<LinkedAccounts />, { api: withConsents(() => []) });
    await screen.findByText("HDFC Bank");
    expect(screen.getAllByText("Revoked")).toHaveLength(7);
  });
});

describe("Consents (prototype consent manager)", () => {
  it("states how many are active and how often data refreshes", async () => {
    renderWithI18n(<Consents />);
    expect(await screen.findByText("2 active consents. Data is refreshed every 12 hours.")).toBeInTheDocument();
  });

  it("lists each consent with its scope, its expiry and its state", async () => {
    renderWithI18n(<Consents />);
    await screen.findByText("Financial dashboard");
    expect(screen.getByText("Balances, transactions, holdings")).toBeInTheDocument();
    expect(screen.getByText("Health score")).toBeInTheDocument();
    expect(screen.getByText("Aggregated analysis only")).toBeInTheDocument();
    expect(screen.getAllByText("Expires 24 September 2027 · 12 months")).toHaveLength(2);
    expect(screen.getAllByText("Active")).toHaveLength(2);
  });

  it("says what revoking does", async () => {
    renderWithI18n(<Consents />);
    await screen.findByText("Financial dashboard");
    expect(screen.getByRole("region", { name: "Revoking consent" })).toHaveTextContent("We delete your data within 24 hours of revocation.");
  });

  it("says '1 active consent' in the singular, and none when none", async () => {
    const { unmount } = renderWithI18n(<Consents />, { api: withConsents((c) => c.slice(0, 1)) });
    expect(await screen.findByText("1 active consent. Data is refreshed every 12 hours.")).toBeInTheDocument();
    unmount();
    renderWithI18n(<Consents />, { api: withConsents(expired) });
    expect(await screen.findByText("No consents are active.")).toBeInTheDocument();
    expect(screen.getAllByText("Expired")).toHaveLength(2);
  });

  it("goes Back to You", async () => {
    renderWithI18n(<Consents />);
    await screen.findByText("Financial dashboard");
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/you");
  });
});

describe("Profile and Privacy", () => {
  it("shows the name, email and city", async () => {
    renderWithI18n(<Profile />);
    await screen.findByText("Aarav Mehta");
    expect(screen.getByText("aarav.mehta@example.com")).toBeInTheDocument();
    expect(screen.getByText("Bengaluru")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Profile");
  });

  it("says in plain words where the data comes from, how often it refreshes and what is deleted when", async () => {
    renderWithI18n(<Privacy />);
    await screen.findByText("Where it comes from");
    expect(screen.getByText("Every 12 hours while a consent is active.")).toBeInTheDocument();
    expect(screen.getByText(/We delete your data within 24 hours\. Backup copies clear within 14 days\./)).toBeInTheDocument();
    expect(screen.getByText(/kept for 3 years as required by RBI/)).toBeInTheDocument();
  });

  it("leaves out the refresh line when no consent is active", async () => {
    renderWithI18n(<Privacy />, { api: withConsents(expired) });
    await screen.findByText("Where it comes from");
    expect(screen.queryByText("How often it refreshes")).not.toBeInTheDocument();
  });
});

describe("You: Hindi and accessibility", () => {
  it("is translated across the screens", async () => {
    renderWithI18n(<You />, { lng: "hi" });
    expect(await screen.findByRole("link", { name: /जुड़े हुए खाते/ })).toHaveTextContent("7 कनेक्शन");
    expect(screen.getByRole("link", { name: /सहमति प्रबंधक/ })).toHaveTextContent("2 सक्रिय · अगली समाप्ति सित॰ 2027");
  });

  it("is translated on the consent manager", async () => {
    renderWithI18n(<Consents />, { lng: "hi" });
    expect(await screen.findByText("2 सक्रिय सहमतियाँ। डेटा हर 12 घंटे में ताज़ा होता है।")).toBeInTheDocument();
    expect(screen.getAllByText("सक्रिय")).toHaveLength(2);
    expect(screen.getAllByText("24 सितंबर 2027 को समाप्त · 12 महीने")).toHaveLength(2);
  });

  it.each([
    ["You", You],
    ["LinkedAccounts", LinkedAccounts],
    ["Consents", Consents],
    ["Profile", Profile],
    ["Privacy", Privacy],
  ] as const)("%s has no accessibility violations in en and hi", async (_name, Page) => {
    for (const lng of ["en", "hi"] as Language[]) {
      const { container, unmount } = renderWithI18n(<Page />, { lng });
      await screen.findAllByRole("link");
      await screen.findAllByText(/\S/);
      await new Promise((r) => setTimeout(r, 30));
      await expectAccessible(container);
      unmount();
    }
  });
});

describe("You: the walk in the real app", () => {
  it("goes from the You tab to the consent manager through Linked accounts, and back", async () => {
    window.history.pushState({}, "", "/you");
    render(
      <I18nextProvider i18n={createI18n("en")}>
        <ApiProvider api={createMockApi()}>
          <App />
        </ApiProvider>
      </I18nextProvider>,
    );
    await userEvent.click(await screen.findByRole("link", { name: /Linked accounts/ }));
    await userEvent.click((await screen.findAllByRole("link", { name: /HDFC Bank/ }))[0]);
    expect(await screen.findByRole("heading", { level: 1, name: "Consent manager" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "Back" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Aarav Mehta" })).toBeInTheDocument();
    window.history.pushState({}, "", "/");
  });
});
