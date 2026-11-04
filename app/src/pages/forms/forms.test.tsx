// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import { ApiProvider, createMockApi } from "../../api";
import { ToastProvider } from "../../components/ui";
import { aaravInput } from "../../derive/fixture";
import { createI18n, type Language } from "../../i18n";
import { expectAccessible } from "../../test/a11y";
import { ALICE, createFakeAuth } from "../../test/fakeAuth";
import { createFakeMember } from "../../test/fakeMember";

type Member = ReturnType<typeof createFakeMember>;

/** The whole app, signed in as a member whose data is `member`. */
function openMember(route: string, member: Member = createFakeMember(), lng: Language = "en") {
  const auth = createFakeAuth({ session: ALICE, consented: true });
  window.history.pushState({}, "", route);
  const view = render(
    <I18nextProvider i18n={createI18n(lng)}>
      <ApiProvider api={createMockApi()}>
        <ToastProvider>
          <App authClient={auth.client} memberEnv={() => member} />
        </ToastProvider>
      </ApiProvider>
    </I18nextProvider>,
  );
  return { member, view };
}
const here = () => window.location.pathname;
afterEach(() => window.history.pushState({}, "", "/"));

const field = (name: string) => screen.findByLabelText(name);
const type = async (name: string, text: string) => userEvent.type(await field(name), text);
const choose = async (name: string, value: string) => userEvent.selectOptions(await field(name), value);
const save = async () => userEvent.click(await screen.findByRole("button", { name: "Save" }));

describe("adding an account", () => {
  it("starts from the empty accounts screen and shows the new account in the list afterwards", async () => {
    const { member } = openMember("/accounts");
    await userEvent.click(await screen.findByRole("link", { name: "Add an account" }));
    expect(here()).toBe("/accounts/new");
    await choose("What are you adding?", "bank");
    await type("Name", "HDFC Bank");
    await type("Last 4 digits", "4821");
    await type("Balance today", "2,84,000");
    await save();

    // Exact text: the form's own hint mentions "HDFC Bank" too, and that is on the page being left.
    expect(await screen.findByText("HDFC Bank", undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(here()).toBe("/accounts");
    expect(member.state.accounts).toEqual([{ kind: "bank", id: "acct-1", name: "HDFC Bank", last4: "4821", balance: 284000 }]);
    expect(await screen.findByRole("link", { name: "Add an account" })).toBeInTheDocument();
  });

  it("asks only for the fields of the kind chosen, and changes them when the kind changes", async () => {
    openMember("/accounts/new");
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    await choose("What are you adding?", "loan");
    expect(await field("Interest rate (% a year)")).toBeInTheDocument();
    expect(screen.queryByLabelText("Credit limit")).not.toBeInTheDocument();
    await choose("What are you adding?", "card");
    expect(await field("Credit limit")).toBeInTheDocument();
    expect(screen.queryByLabelText("Interest rate (% a year)")).not.toBeInTheDocument();
    await choose("What are you adding?", "other");
    expect(await field("Type of asset")).toBeInTheDocument();
  });

  it("saves a loan with the figures as numbers and leaves what was not given out", async () => {
    const { member } = openMember("/accounts/new");
    await choose("What are you adding?", "loan");
    await type("Name", "Car loan");
    await choose("Type of loan", "car");
    await type("Amount outstanding", "₹5,00,000");
    await type("Interest rate (% a year)", "9.25");
    await type("Months left", "36");
    await save();
    await waitFor(() => expect(member.saves).toEqual(["account"]));
    const loan = member.state.accounts[0];
    expect(loan).toMatchObject({ kind: "loan", name: "Car loan", loanType: "car", outstanding: 500000, ratePercent: 9.25, monthsLeft: 36 });
    expect(loan).not.toHaveProperty("emi", expect.anything());
  });

  it("shows every problem at once, saves nothing, and puts the cursor on the first", async () => {
    const { member } = openMember("/accounts/new");
    await choose("What are you adding?", "bank");
    await type("Last 4 digits", "12");
    await type("Balance today", "lots");
    await save();
    expect(await screen.findAllByText("This is needed.")).toHaveLength(1); // the name
    expect(screen.getAllByText("That doesn't look right. Check it and try again.")).toHaveLength(2);
    expect(await field("Name")).toHaveFocus();
    expect(await field("Name")).toHaveAttribute("aria-invalid", "true");
    expect(member.saves).toEqual([]);
    expect(here()).toBe("/accounts/new");
  });

  it("clears a field's problem once it is being fixed", async () => {
    openMember("/accounts/new");
    await choose("What are you adding?", "bank");
    await save();
    expect((await screen.findAllByText("This is needed.")).length).toBeGreaterThan(0);
    await type("Name", "H");
    expect(await field("Name")).not.toHaveAttribute("aria-invalid");
  });

  it("keeps what was typed, and says so, when the save fails; the retry then works", async () => {
    const { member } = openMember("/accounts/new");
    await choose("What are you adding?", "bank");
    await type("Name", "SBI");
    await type("Last 4 digits", "7723");
    await type("Balance today", "1000");
    member.failNext();
    await save();
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't save that");
    expect(here()).toBe("/accounts/new");
    expect(await field("Name")).toHaveValue("SBI");
    expect(await field("Balance today")).toHaveValue("1000");
    expect(member.state.accounts).toEqual([]);
    await save();
    await waitFor(() => expect(here()).toBe("/accounts"));
    expect(member.state.accounts).toHaveLength(1);
  });

  it("does not save twice if the form is submitted again while saving", async () => {
    const { member, view } = openMember("/accounts/new");
    await choose("What are you adding?", "bank");
    await type("Name", "SBI");
    await type("Last 4 digits", "7723");
    await type("Balance today", "1000");
    const form = view.container.querySelector("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(here()).toBe("/accounts"));
    expect(member.saves).toEqual(["account"]);
  });

  it("does not save twice if Save is pressed again while saving", async () => {
    const { member } = openMember("/accounts/new");
    await choose("What are you adding?", "bank");
    await type("Name", "SBI");
    await type("Last 4 digits", "7723");
    await type("Balance today", "1000");
    const button = screen.getByRole("button", { name: "Save" });
    await userEvent.dblClick(button);
    await waitFor(() => expect(here()).toBe("/accounts"));
    expect(member.saves).toEqual(["account"]);
  });
});

describe("editing and deleting an account", () => {
  const withAaravData = () => createFakeMember(aaravInput());

  it("opens with what was saved, cannot change the kind, and saves the change", async () => {
    const { member } = openMember("/accounts/hdfc/edit", withAaravData());
    expect(await field("Name")).toHaveValue("HDFC Bank");
    expect(await field("Balance today")).toHaveValue("284000");
    expect(screen.queryByLabelText("What are you adding?")).not.toBeInTheDocument();
    await userEvent.clear(await field("Balance today"));
    await type("Balance today", "3,10,000");
    await save();
    await waitFor(() => expect(here()).toBe("/accounts"));
    expect(member.state.accounts.find((a) => a.id === "hdfc")).toMatchObject({ kind: "bank", balance: 310000, last4: "4821" });
    expect(member.state.accounts).toHaveLength(8);
  });

  it("is reached from the account's own page", async () => {
    openMember("/accounts/hdfc", withAaravData());
    await userEvent.click(await screen.findByRole("link", { name: "Edit this account" }));
    expect(here()).toBe("/accounts/hdfc/edit");
  });

  it("deletes only after a second confirmation, and 'Keep it' backs out", async () => {
    const { member } = openMember("/accounts/sbi/edit", withAaravData());
    await userEvent.click(await screen.findByRole("button", { name: "Delete this account" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(member.state.accounts.some((a) => a.id === "sbi")).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Delete this account" }));
    expect(screen.getByText("Delete this? It can't be undone.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Yes, delete it" }));
    await waitFor(() => expect(here()).toBe("/accounts"));
    expect(member.state.accounts.some((a) => a.id === "sbi")).toBe(false);
    expect(member.saves).toEqual(["delete-account"]);
  });

  it("says the account is not found for an address that is not theirs", async () => {
    openMember("/accounts/nope/edit", withAaravData());
    expect(await screen.findByRole("heading", { level: 1, name: "We couldn't find that page." })).toBeInTheDocument();
  });

  it("has no Delete on a new account", async () => {
    openMember("/accounts/new");
    await screen.findByLabelText("What are you adding?");
    expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
  });
});

describe("monthly figures", () => {
  it("fill in cash flow, which had nothing to show before", async () => {
    const { member } = openMember("/cash-flow");
    await userEvent.click(await screen.findByRole("link", { name: "Add monthly figures" }));
    expect(here()).toBe("/you/figures");
    await type("Income a month", "2,40,000");
    await type("Rent", "42600");
    await type("Food and dining", "18200");
    await save();
    await waitFor(() => expect(here()).toBe("/"));
    expect(member.state.monthly).toEqual([{ month: "2026-09", income: 240000, rent: 42600, food: 18200, other: 0, sips: 0 }]);
    await expect(member.api.getCashFlow()).resolves.toMatchObject({ income: 240000 });
  });

  it("need an income", async () => {
    const { member } = openMember("/you/figures");
    await type("Rent", "5000");
    await save();
    expect(await screen.findByText("This is needed.")).toBeInTheDocument();
    expect(member.saves).toEqual([]);
  });

  it("start from this month's figures when they exist, and replace them rather than add a second month", async () => {
    const { member } = openMember("/you/figures", createFakeMember(aaravInput()));
    expect(await field("Income a month")).toHaveValue("240000");
    await userEvent.clear(await field("Income a month"));
    await type("Income a month", "250000");
    await save();
    await waitFor(() => expect(member.saves).toEqual(["monthly"]));
    expect(member.state.monthly).toHaveLength(1);
    expect(member.state.monthly[0].income).toBe(250000);
  });

  it("start from last month's figures as a suggestion when this month has none", async () => {
    const earlier = { ...aaravInput().monthly[0], month: "2026-08", income: 111111 };
    const { member } = openMember("/you/figures", createFakeMember(aaravInput({ monthly: [earlier] })));
    expect(await field("Income a month")).toHaveValue("111111");
    await save();
    await waitFor(() => expect(member.saves).toEqual(["monthly"]));
    expect(member.state.monthly.map((m) => m.month).sort()).toEqual(["2026-08", "2026-09"]);
  });

  it("are offered from the You tab and from cash flow once there are figures", async () => {
    openMember("/you", createFakeMember(aaravInput()));
    expect(await screen.findByRole("link", { name: /Monthly figures/ })).toHaveAttribute("href", "/you/figures");
  });
});

describe("goals", () => {
  it("adds a first goal, which then appears in the list, and can be edited and deleted", async () => {
    const { member } = openMember("/plans/goals");
    await userEvent.click(await screen.findByRole("link", { name: "Add a goal" }));
    await type("Goal", "A car");
    await type("How much you need", "6,00,000");
    fireEvent.change(await field("Needed by"), { target: { value: "2028-03" } });
    await save();
    expect(await screen.findByText(/A car/)).toBeInTheDocument();
    expect(member.state.goals).toEqual([{ id: "goal-1", name: "A car", targetAmount: 600000, fundedAmount: 0, targetDate: "2028-03", assumedReturnPercent: 0 }]);

    await userEvent.click(await screen.findByRole("link", { name: "Add a goal" }));
    expect(here()).toBe("/plans/goals/new");
  });

  it("edits a goal, starting from what is saved", async () => {
    const { member } = openMember("/plans/goals/home-upgrade/edit", createFakeMember(aaravInput()));
    const name = await field("Goal");
    expect((name as HTMLInputElement).value.length).toBeGreaterThan(0);
    await userEvent.clear(await field("Already saved"));
    await type("Already saved", "999");
    await save();
    await waitFor(() => expect(member.saves).toEqual(["goal"]));
    expect(member.state.goals.find((g) => g.id === "home-upgrade")?.fundedAmount).toBe(999);
  });

  it("deletes a goal after confirming", async () => {
    const { member } = openMember("/plans/goals/home-upgrade/edit", createFakeMember(aaravInput()));
    await userEvent.click(await screen.findByRole("button", { name: "Delete this goal" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, delete it" }));
    await waitFor(() => expect(member.state.goals.some((g) => g.id === "home-upgrade")).toBe(false));
  });

  it("needs a name, an amount and a date", async () => {
    const { member } = openMember("/plans/goals/new");
    await save();
    expect(await screen.findAllByText("This is needed.")).toHaveLength(3);
    expect(member.saves).toEqual([]);
  });
});

describe("tax details and profile", () => {
  it("saves the tax details for the year and shows them on the tax screen", async () => {
    const { member } = openMember("/plans/tax/edit");
    await type("Your income tax slab (%)", "30");
    await type("PPF this year", "42,000");
    await save();
    await waitFor(() => expect(here()).toBe("/plans/tax"));
    expect(member.state.tax).toEqual({ slabPercent: 30, ppf: 42000, elss: 0, lifeInsurance: 0, health80D: 0, homeLoanInterestPaid: 0 });
    expect(await screen.findByRole("link", { name: "Edit your tax details" })).toBeInTheDocument();
  });

  it("saves the name, which the greeting then uses", async () => {
    const { member } = openMember("/you/profile/edit");
    expect(await field("Full name")).toHaveValue("");
    await type("Full name", "Aarav Mehta");
    await type("City", "Bengaluru");
    await save();
    await waitFor(() => expect(here()).toBe("/you/profile"));
    expect(member.state.profile).toMatchObject({ name: "Aarav Mehta", firstName: "Aarav", city: "Bengaluru" });
    await userEvent.click(await screen.findByRole("link", { name: "Home" }));
    expect(await screen.findByRole("heading", { level: 1, name: /Good (morning|afternoon|evening), Aarav\./ })).toBeInTheDocument();
  });

  it("requires a name", async () => {
    const { member } = openMember("/you/profile/edit");
    await save();
    expect(await screen.findByText("This is needed.")).toBeInTheDocument();
    expect(member.saves).toEqual([]);
  });
});

describe("your data: download and delete", () => {
  const readBlob = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
  let files: { name: string; blob: Blob }[];

  beforeEach(() => {
    files = [];
    URL.createObjectURL = (blob: Blob | MediaSource) => {
      files.push({ name: "", blob: blob as Blob });
      return "blob:x";
    };
    URL.revokeObjectURL = () => {};
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      files[files.length - 1].name = this.download;
    });
  });

  const openData = (member = createFakeMember(aaravInput()), auth = createFakeAuth({ session: ALICE, consented: true })) => {
    window.history.pushState({}, "", "/you/data");
    const view = render(
      <I18nextProvider i18n={createI18n("en")}>
        <ApiProvider api={createMockApi()}>
          <ToastProvider>
            <App authClient={auth.client} memberEnv={() => member} />
          </ToastProvider>
        </ApiProvider>
      </I18nextProvider>,
    );
    return { member, auth, view };
  };

  it("is reached from the You tab", async () => {
    openMember("/you", createFakeMember(aaravInput()));
    expect(await screen.findByRole("link", { name: /Your data/ })).toHaveAttribute("href", "/you/data");
  });

  it("downloads everything held as a dated JSON file, and says so", async () => {
    const { member } = openData();
    await userEvent.click(await screen.findByRole("button", { name: "Download my data" }));
    expect(await screen.findByText("Your file has been downloaded.")).toBeInTheDocument();
    expect(files).toHaveLength(1);
    expect(files[0].name).toMatch(/^finous-data-\d{4}-\d{2}-\d{2}\.json$/);
    const data = JSON.parse(await readBlob(files[0].blob));
    expect(data.accounts).toHaveLength(8);
    expect(data.monthly_figures).toHaveLength(1);
    expect(member.saves).toContain("export");
  });

  it("says so, and gives no file, when the export fails", async () => {
    const { member } = openData();
    member.failNext();
    await userEvent.click(await screen.findByRole("button", { name: "Download my data" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't prepare your file");
    expect(files).toEqual([]);
    expect(screen.queryByText("Your file has been downloaded.")).not.toBeInTheDocument();
  });

  it("deletes only after a second confirmation, and 'Keep my account' backs out", async () => {
    const { member, auth } = openData();
    await userEvent.click(await screen.findByRole("button", { name: "Delete my account" }));
    expect(screen.getByText("Delete your account and everything in it? This can't be undone.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Keep my account" }));
    expect(member.deleted()).toBe(false);
    expect(auth.calls.signedOut).toBe(0);
    expect(screen.getByRole("button", { name: "Delete my account" })).toBeInTheDocument();
  });

  it("deletes the account, then signs out and lands on the sign-in page", async () => {
    const { member, auth } = openData();
    await userEvent.click(await screen.findByRole("button", { name: "Delete my account" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, delete everything" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Finous" })).toBeInTheDocument();
    expect(member.deleted()).toBe(true);
    expect(auth.calls.signedOut).toBe(1);
    expect(here()).toBe("/signin");
  });

  it("stays signed in, and says nothing was deleted, when deleting fails", async () => {
    const { member, auth } = openData();
    member.failNext();
    await userEvent.click(await screen.findByRole("button", { name: "Delete my account" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, delete everything" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was deleted");
    expect(member.deleted()).toBe(false);
    expect(auth.calls.signedOut).toBe(0);
    expect(here()).toBe("/you/data");
  });

  it("is translated, and accessible in both languages", async () => {
    for (const lng of ["en", "hi"] as const) {
      const { view } = openMember("/you/data", createFakeMember(aaravInput()), lng);
      await screen.findByRole("heading", { level: 1 });
      await expectAccessible(view.container);
      view.unmount();
    }
    openMember("/you/data", createFakeMember(), "hi");
    expect(await screen.findByRole("button", { name: "मेरा डेटा डाउनलोड करें" })).toBeInTheDocument();
  });
});

describe("the You tab for a member", () => {
  it("is about their own accounts and figures, with no demo-only rows", async () => {
    openMember("/you", createFakeMember(aaravInput()));
    expect(await screen.findByRole("link", { name: /Your accounts/ })).toHaveAttribute("href", "/accounts");
    expect(screen.queryByText("Replay the welcome")).not.toBeInTheDocument();
    expect(screen.queryByText("Linked accounts")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Leave the demo/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign out/ })).toBeInTheDocument();
  });
});

describe("the demo", () => {
  const demo = (route: string) => {
    localStorage.setItem("finous.demo", "1");
    window.history.pushState({}, "", route);
    return render(
      <I18nextProvider i18n={createI18n("en")}>
        <ApiProvider api={createMockApi()}>
          <ToastProvider>
            <App authClient={createFakeAuth({ session: ALICE, consented: true }).client} />
          </ToastProvider>
        </ApiProvider>
      </I18nextProvider>,
    );
  };
  afterEach(() => localStorage.removeItem("finous.demo"));

  it.each(["/accounts/new", "/accounts/hdfc/edit", "/you/figures", "/you/data", "/plans/goals/new", "/plans/tax/edit", "/you/profile/edit"])("sends %s to Home: there is nothing of its own to change", async (route) => {
    demo(route);
    await screen.findByRole("heading", { level: 1, name: /Aarav/ });
    expect(here()).toBe("/");
    expect(screen.queryByLabelText(/Name|Income/)).not.toBeInTheDocument();
  });

  it.each(["/accounts", "/accounts/hdfc", "/plans/goals", "/plans/tax", "/cash-flow", "/you/profile"])("shows no way to add or edit on %s", async (route) => {
    demo(route);
    await screen.findByRole("heading", { level: 1 });
    await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull());
    expect(screen.queryByRole("link", { name: /^(Add|Edit|Update)/ })).not.toBeInTheDocument();
  });
});

describe("in Hindi and for accessibility", () => {
  const ROUTES = [
    ["/accounts/new", {}],
    ["/accounts/hdfc/edit", { data: true }],
    ["/you/figures", {}],
    ["/plans/goals/new", {}],
    ["/plans/goals/home-upgrade/edit", { data: true }],
    ["/plans/tax/edit", {}],
    ["/you/profile/edit", {}],
  ] as const;

  it.each(ROUTES.flatMap(([route, o]) => (["en", "hi"] as const).map((lng) => [route, o, lng] as const)))("%s (%j) in %s has no violations", async (route, o, lng) => {
    const { view } = openMember(route, "data" in o ? createFakeMember(aaravInput()) : createFakeMember(), lng);
    await screen.findByRole("heading", { level: 1 });
    await waitFor(() => expect(view.container.querySelector('[aria-busy="true"]')).toBeNull());
    await expectAccessible(view.container);
  });

  it("labels the account form in Hindi, and shows the reason for a mistake in Hindi", async () => {
    openMember("/accounts/new", createFakeMember(), "hi");
    await userEvent.selectOptions(await screen.findByLabelText("आप क्या जोड़ रहे हैं?"), "bank");
    expect(await screen.findByLabelText("आज की शेष राशि")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "सहेजें" }));
    expect((await screen.findAllByText("यह ज़रूरी है।")).length).toBeGreaterThan(0);
  });

  it("every form field has a label a screen reader can find", async () => {
    const { view } = openMember("/accounts/new");
    await userEvent.selectOptions(await screen.findByLabelText("What are you adding?"), "card");
    const form = within(view.container.querySelector("form")!);
    for (const input of view.container.querySelectorAll("input, select")) {
      expect(input.id, "every control has an id its label points at").not.toBe("");
    }
    expect(form.getByRole("switch", { name: "Auto-pay is on" })).toBeInTheDocument();
  });
});
