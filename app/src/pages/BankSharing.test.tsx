// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../App";
import { ApiProvider, createMockApi } from "../api";
import { forgetNotNow } from "../bank/asked";
import { forgetSettled } from "../bank/BankAsk";
import { parseBranding, type BankBranding } from "../bank/branding";
import type { BankLookup } from "../bank/lookup";
import { ToastProvider } from "../components/ui";
import { createI18n, type Language } from "../i18n";
import { expectAccessible } from "../test/a11y";
import { ALICE, createFakeAuth } from "../test/fakeAuth";
import { createFakeMember } from "../test/fakeMember";

const make = (over: Record<string, unknown> = {}): BankBranding =>
  parseBranding({
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
    ...over,
  })!;

type Member = ReturnType<typeof createFakeMember>;

/** The whole app at a bank's address (or Finous's own, with host "app.finous.site"), signed in as a member whose data is `member`. */
function open(
  route: string,
  { member = createFakeMember(), bank = make(), host = "seva.app.finous.site", lng = "en", demo = false }: { member?: Member; bank?: BankBranding | null; host?: string; lng?: Language; demo?: boolean } = {},
) {
  const auth = demo ? null : createFakeAuth({ session: ALICE, consented: true });
  window.history.pushState({}, "", route);
  const lookup: BankLookup = async () => bank;
  const view = render(
    <I18nextProvider i18n={createI18n(lng)}>
      <ApiProvider api={createMockApi()}>
        <ToastProvider>
          <App authClient={auth?.client ?? null} memberEnv={() => member} host={host} bankLookup={lookup} />
        </ToastProvider>
      </ApiProvider>
    </I18nextProvider>,
  );
  return { member, view };
}

const here = () => window.location.pathname;
const theSwitch = (name: RegExp = /Let Seva Co-operative Bank see these accounts/) => screen.findByRole("switch", { name });
/** The line that says whether sharing is on. The toast region is a status too, so look for this one by what it says. */
const status = () => screen.getAllByRole("status").find((el) => /^Sharing is/.test(el.textContent ?? ""))!;
const arrivedAtApp = () => screen.findByRole("navigation", { name: "Main" });

beforeEach(() => {
  forgetSettled();
  forgetNotNow();
  window.localStorage.clear();
});
afterEach(() => {
  window.history.pushState({}, "", "/");
  document.head.innerHTML = "";
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-tenant");
});

describe("the question, put once at the bank's front door", () => {
  it("asks a new member before anything is shared: the switch is off and nothing has been recorded", async () => {
    const { member } = open("/");
    expect(await screen.findByRole("heading", { level: 1, name: "Sharing with Seva Co-operative Bank" })).toBeInTheDocument();
    expect(here()).toBe("/you/bank");
    expect(await theSwitch()).toHaveAttribute("aria-checked", "false");
    expect(status()).toHaveTextContent("Sharing is off. Seva Co-operative Bank cannot see anything from your Finous.");
    expect(member.sharing.size).toBe(0);
    // They arrived through the bank's address, which is all that has been recorded: nothing is shared
    await waitFor(() => expect(member.joined.has("b1")).toBe(true));
  });

  it("says what the bank would see, what it never sees, that looks are recorded, and that stopping is immediate", async () => {
    open("/");
    await theSwitch();
    const sees = screen.getByRole("region", { name: /What Seva Co-operative Bank would see/ });
    expect(sees).toHaveTextContent("Your first name and the first letter of your last name.");
    expect(sees).toHaveTextContent("The accounts Seva Co-operative Bank itself supplied: their type, branch and details.");
    const never = screen.getByRole("region", { name: /never sees/ });
    expect(never).toHaveTextContent(/Anything you added yourself, your transactions, goals, monthly figures and tax details, your email address/);
    expect(never).toHaveTextContent(/it is recorded.*Your data/);
    expect(screen.getByText("You can stop at any time. It takes effect straight away.")).toBeInTheDocument();
  });

  it("'Not now' goes Home, records nothing, and the question is not put again", async () => {
    const { member, view } = open("/");
    await userEvent.click(await screen.findByRole("button", { name: "Not now" }));
    await arrivedAtApp();
    expect(here()).toBe("/");
    expect(member.sharing.size).toBe(0);
    view.unmount();
    forgetSettled();
    open("/", { member });
    await arrivedAtApp();
    expect(here()).toBe("/");
    expect(screen.queryByRole("heading", { name: /Sharing with/ })).not.toBeInTheDocument();
  });

  it("turning it on joins the bank, records the choice, says so, and lists it in the history; Done goes Home", async () => {
    const { member } = open("/");
    await userEvent.click(await theSwitch());
    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true"));
    expect(member.joined.has("b1")).toBe(true);
    expect(member.saves).toContain("share");
    expect(status()).toHaveTextContent("Sharing is on. Seva Co-operative Bank can see the accounts described above.");
    const history = within(screen.getByRole("region", { name: "Your choices" }));
    expect(history.getByText("Turned on")).toBeInTheDocument();
    expect(history.getByText("18 November 2026, 2:31 PM")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await arrivedAtApp();
    expect(here()).toBe("/");
  });

  it("does not ask someone who has already answered, either way", async () => {
    const member = createFakeMember();
    member.sharing.set("b1", [
      { sharing: false, at: "2026-11-10T04:30:00.000Z" },
      { sharing: true, at: "2026-11-09T04:30:00.000Z" },
    ]);
    open("/", { member });
    await arrivedAtApp();
    expect(here()).toBe("/");
  });

  it("asks about each bank separately", async () => {
    const member = createFakeMember();
    member.sharing.set("b1", [{ sharing: true, at: "2026-11-10T04:30:00.000Z" }]);
    open("/", { member, bank: make({ id: "b2", subdomain: "kosh", name: "Kosh Bank" }), host: "kosh.app.finous.site" });
    expect(await screen.findByRole("heading", { level: 1, name: "Sharing with Kosh Bank" })).toBeInTheDocument();
  });

  it("lets the member in when the answer cannot be found out: not being able to ask never locks anyone out, and nothing is shared", async () => {
    const member = createFakeMember();
    member.failNext();
    open("/", { member });
    await arrivedAtApp();
    expect(here()).toBe("/");
    expect(member.sharing.size).toBe(0);
  });

  it("a new member's screen has no history section until there is a history", async () => {
    open("/");
    await theSwitch();
    expect(screen.queryByRole("region", { name: "Your choices" })).not.toBeInTheDocument();
  });

  it("only asks at the front door: a link to any other screen opens it", async () => {
    open("/plans");
    await arrivedAtApp();
    expect(here()).toBe("/plans");
  });

  it("never asks on Finous's own address", async () => {
    const { member } = open("/", { host: "app.finous.site" });
    await arrivedAtApp();
    expect(here()).toBe("/");
    expect(member.sharing.size).toBe(0);
  });
});

describe("under You: change your mind at any time", () => {
  const sharing = () => {
    const member = createFakeMember();
    member.sharing.set("b1", [{ sharing: true, at: "2026-11-10T04:30:00.000Z" }]);
    member.joined.add("b1");
    return member;
  };

  it("has a row for the bank, at a bank's address", async () => {
    open("/you");
    const row = await screen.findByRole("link", { name: /Sharing with Seva Co-operative Bank/ });
    expect(row).toHaveAttribute("href", "/you/bank");
    expect(row).toHaveTextContent("Choose what Seva Co-operative Bank can see");
  });

  it("has no such row on Finous's own address", async () => {
    open("/you", { host: "app.finous.site" });
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("link", { name: /Sharing with/ })).not.toBeInTheDocument();
  });

  it("has no such row in the demo, even at a bank's address", async () => {
    open("/you", { demo: true });
    await screen.findByTestId("bank-bar");
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("link", { name: /Sharing with/ })).not.toBeInTheDocument();
  });

  it("sends the bank's screen back to You on Finous's own address", async () => {
    open("/you/bank", { host: "app.finous.site" });
    await waitFor(() => expect(here()).toBe("/you"));
  });

  it("stopping takes effect at once: recorded, shown, and the history gains the change, newest first", async () => {
    const member = sharing();
    open("/you/bank", { member });
    const toggle = await theSwitch();
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await userEvent.click(toggle);
    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false"));
    expect(member.saves).toContain("unshare");
    expect(member.sharing.get("b1")![0].sharing).toBe(false);
    expect(status()).toHaveTextContent("Sharing is off.");
    const items = within(screen.getByRole("region", { name: "Your choices" })).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(["Turned off18 November 2026, 2:31 PM", "Turned on10 November 2026, 10:00 AM"]);
  });

  it("can be turned on again later, and Done goes back to You", async () => {
    const member = sharing();
    open("/you/bank", { member });
    await userEvent.click(await theSwitch());
    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false"));
    await userEvent.click(screen.getByRole("switch"));
    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true"));
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(await screen.findByRole("link", { name: /Sharing with Seva Co-operative Bank/ })).toBeInTheDocument();
    expect(here()).toBe("/you");
  });

  it("says so, and changes nothing, when the choice cannot be saved", async () => {
    const member = sharing();
    open("/you/bank", { member });
    const toggle = await theSwitch();
    member.failNext();
    await userEvent.click(toggle);
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't save your choice. Nothing changed.");
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(member.sharing.get("b1")).toHaveLength(1);
    expect(status()).toHaveTextContent("Sharing is on.");
  });

  it("keeps the switch from being used again while a choice is being saved", async () => {
    const member = sharing();
    const real = member.data.bankSharing;
    let finish!: () => void;
    member.data.bankSharing = { join: real.join, read: real.read, set: (id, on) => new Promise<void>((done) => void (finish = () => void real.set(id, on).then(done))) };
    open("/you/bank", { member });
    await userEvent.click(await theSwitch());
    await waitFor(() => expect(screen.getByRole("switch")).toBeDisabled());
    expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.getByRole("switch")).toBeEnabled());
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("shows what the database holds, not a guess, when a choice was saved but the screen could not read it back", async () => {
    const member = createFakeMember();
    const real = member.data.bankSharing;
    let failRead = false;
    member.data.bankSharing = {
      join: real.join,
      set: real.set,
      read: async (id) => {
        if (failRead) {
          failRead = false;
          throw new Error("could not read");
        }
        return real.read(id);
      },
    };
    open("/", { member });
    await theSwitch();
    failRead = true;
    await userEvent.click(screen.getByRole("switch"));
    // The save went through, then the read failed: say so, then show the truth from a second read
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't save your choice.");
    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true"));
    expect(member.sharing.get("b1")).toHaveLength(1);
    // It was still the question when it opened, so Done goes Home rather than back to You
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await arrivedAtApp();
    expect(here()).toBe("/");
  });

  it("offers a retry when the choice cannot be loaded; retry recovers", async () => {
    const member = sharing();
    member.failNext();
    open("/you/bank", { member });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await theSwitch()).toHaveAttribute("aria-checked", "true");
  });
});

describe("Your data", () => {
  it("says the downloaded file also holds the banks joined, what was shared, and each look by a bank", async () => {
    open("/you/data");
    expect(await screen.findByText(/the banks you joined, what you chose to share, and each time a bank looked at your details/)).toBeInTheDocument();
  });
});

describe("Hindi and accessibility", () => {
  it("is in Hindi, dates included", async () => {
    const member = createFakeMember();
    member.sharing.set("b1", [{ sharing: true, at: "2026-11-10T04:30:00.000Z" }]);
    open("/you/bank", { member, lng: "hi" });
    expect(await screen.findByRole("heading", { level: 1, name: "Seva Co-operative Bank के साथ साझा करना" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Seva Co-operative Bank को ये खाते देखने दें" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("चालू किया")).toBeInTheDocument();
    expect(screen.getByText(/10 नवंबर 2026/)).toBeInTheDocument();
  });

  it.each(["en", "hi"] as Language[])("the question has no accessibility violations in %s", async (lng) => {
    const { view } = open("/", { lng });
    await screen.findByRole("switch");
    await expectAccessible(view.container);
  });

  it.each(["en", "hi"] as Language[])("the screen, with history, has no accessibility violations in %s", async (lng) => {
    const member = createFakeMember();
    member.sharing.set("b1", [{ sharing: true, at: "2026-11-10T04:30:00.000Z" }]);
    const { view } = open("/you/bank", { member, lng });
    await screen.findByRole("switch");
    await expectAccessible(view.container);
  });
});
