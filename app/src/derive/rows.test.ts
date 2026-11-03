import { describe, expect, it } from "vitest";
import { parseMemberRows, parseProfile, parseRates, type RawRows } from "./rows";

const who = { userId: "u1", email: "alice@example.com", asOf: "2026-09-29" };
const empty: RawRows = { profile: null, accounts: [], transactions: [], monthly: [], goals: [], tax: [], snapshots: [], rates: [] };
const parse = (over: Partial<RawRows>) => parseMemberRows({ ...empty, ...over }, who);

const acct = (kind: string, details: unknown, name = "Thing", id = "a1") => ({ id, kind, name, details });

describe("accounts", () => {
  it("reads each kind", () => {
    const { input, skipped } = parse({
      accounts: [
        acct("bank", { last4: "4821", balance: 284000 }, "HDFC Bank", "b"),
        acct("loan", { loanType: "home", outstanding: 6200000, ratePercent: 8.9, monthsLeft: 210, emi: 58345, startedOn: "2025-03", originalAmount: 10000000 }, "Home loan", "l"),
        acct("card", { last4: "4419", outstanding: 18400, limit: 300000, statementDay: 28, dueDay: 15, autoPay: true, minimumDue: 1840 }, "Card", "c"),
        acct("investment", { instrument: "ppf", value: 620000, institution: "HDFC", openedYear: 2019 }, "PPF", "i"),
        acct("other", { assetKind: "gold", value: 150000 }, "Gold", "o"),
      ],
    });
    expect(skipped).toEqual([]);
    expect(input.accounts).toEqual([
      { kind: "bank", id: "b", name: "HDFC Bank", last4: "4821", balance: 284000 },
      { kind: "loan", id: "l", name: "Home loan", loanType: "home", outstanding: 6200000, ratePercent: 8.9, monthsLeft: 210, emi: 58345, startedOn: "2025-03", originalAmount: 10000000 },
      { kind: "card", id: "c", name: "Card", last4: "4419", outstanding: 18400, limit: 300000, statementDay: 28, dueDay: 15, autoPay: true, minimumDue: 1840 },
      { kind: "investment", id: "i", name: "PPF", instrument: "ppf", value: 620000, institution: "HDFC", openedYear: 2019, activeSips: undefined, holdings: undefined },
      { kind: "other", id: "o", name: "Gold", assetKind: "gold", value: 150000 },
    ]);
  });

  it("accepts numbers as numeric strings, as the database may send big numbers", () => {
    const { input } = parse({ accounts: [acct("bank", { last4: "1234", balance: "50000" })] });
    expect(input.accounts[0]).toMatchObject({ balance: 50000 });
  });

  it("leaves the optional parts off when they are missing or null", () => {
    const { input } = parse({ accounts: [acct("loan", { loanType: "car", outstanding: 100, ratePercent: 9, monthsLeft: 12, startedOn: null })] });
    expect(input.accounts[0]).toMatchObject({ emi: undefined, startedOn: undefined, originalAmount: undefined });
  });

  it("treats auto-pay as off unless it is exactly true", () => {
    const base = { last4: "1234", outstanding: 0, limit: 1000, statementDay: 1, dueDay: 20 };
    expect(parse({ accounts: [acct("card", { ...base, autoPay: "yes" })] }).input.accounts[0]).toMatchObject({ autoPay: false });
    expect(parse({ accounts: [acct("card", base)] }).input.accounts[0]).toMatchObject({ autoPay: false });
  });

  it.each([
    ["a bank balance that is not a number", acct("bank", { last4: "1234", balance: "lots" }), "balance"],
    ["a negative balance", acct("bank", { last4: "1234", balance: -5 }), "balance"],
    ["a fractional balance", acct("bank", { last4: "1234", balance: 10.5 }), "balance"],
    ["last four digits that are not four digits", acct("bank", { last4: "12", balance: 5 }), "last4"],
    ["a loan with no months left", acct("loan", { loanType: "home", outstanding: 1, ratePercent: 8, monthsLeft: 0 }), "monthsLeft"],
    ["a loan rate of 90%", acct("loan", { loanType: "home", outstanding: 1, ratePercent: 90, monthsLeft: 12 }), "ratePercent"],
    ["an unknown loan type", acct("loan", { loanType: "boat", outstanding: 1, ratePercent: 8, monthsLeft: 12 }), "loanType"],
    ["a loan start that is not a month", acct("loan", { loanType: "home", outstanding: 1, ratePercent: 8, monthsLeft: 12, startedOn: "March 2025" }), "startedOn"],
    ["a card statement day of 32", acct("card", { last4: "1234", outstanding: 0, limit: 1, statementDay: 32, dueDay: 5 }), "statementDay"],
    ["an unknown instrument", acct("investment", { instrument: "bitcoin", value: 5 }), "instrument"],
    ["an unknown asset kind", acct("other", { assetKind: "yacht", value: 5 }), "assetKind"],
    ["an unknown account kind", acct("crypto", { value: 5 }), "kind"],
    ["details that are not an object", acct("bank", "nope"), "details"],
    ["details that are missing", acct("bank", null), "details"],
    ["a blank name", acct("bank", { last4: "1234", balance: 5 }, "   "), "name"],
  ])("skips %s, and says which field", (_name, row, field) => {
    const { input, skipped } = parse({ accounts: [row as RawRows["accounts"][number]] });
    expect(input.accounts).toEqual([]);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]).toContain(field);
  });

  it("keeps the good rows when another is bad", () => {
    const { input, skipped } = parse({ accounts: [acct("bank", { last4: "1111", balance: 5 }, "Good", "g"), acct("bank", { last4: "x", balance: 5 }, "Bad", "b")] });
    expect(input.accounts.map((a) => a.id)).toEqual(["g"]);
    expect(skipped).toEqual(["account Bad: last4"]);
  });
});

describe("transactions", () => {
  const row = { id: "t1", account_id: "a1", occurred_on: "2026-09-28", occurred_at: "21:12:00", description: " Swiggy ", amount: "-842", category: "food" };

  it("reads a transaction, trimming the description and the seconds off the time", () => {
    expect(parse({ transactions: [row] }).input.transactions).toEqual([{ id: "t1", accountId: "a1", date: "2026-09-28", time: "21:12", description: "Swiggy", amount: -842, category: "food" }]);
  });

  it("gives a transaction with no account an empty account id, and no time when none was recorded", () => {
    expect(parse({ transactions: [{ ...row, account_id: null, occurred_at: null }] }).input.transactions[0]).toMatchObject({ accountId: "", time: undefined });
  });

  it.each([
    ["a zero amount", { amount: 0 }],
    ["an amount that is not whole rupees", { amount: -10.5 }],
    ["a bad date", { occurred_on: "28/09/2026" }],
    ["a blank description", { description: "  " }],
    ["an unknown category", { category: "fun" }],
  ])("skips %s", (_name, change) => {
    const { input, skipped } = parse({ transactions: [{ ...row, ...change }] });
    expect(input.transactions).toEqual([]);
    expect(skipped).toHaveLength(1);
  });
});

describe("monthly figures, goals, snapshots", () => {
  it("reads monthly figures and skips a month that is not a month", () => {
    const m = { month: "2026-09", income: 240000, rent: 42600, food: 18200, other: 32255, sips: 35000 };
    const { input, skipped } = parse({ monthly: [m, { ...m, month: "2026-13" }, { ...m, month: "2026-08", rent: -1 }] });
    expect(input.monthly).toEqual([m]);
    expect(skipped).toHaveLength(2);
  });

  it("reads a goal, keeping the month of its date, and skips one with no target", () => {
    const g = { id: "g", name: " Car ", target_amount: "600000", funded_amount: 120000, target_date: "2027-09-15", assumed_return_percent: "6.5" };
    const { input, skipped } = parse({ goals: [g, { ...g, id: "bad", target_amount: 0 }] });
    expect(input.goals).toEqual([{ id: "g", name: "Car", targetAmount: 600000, fundedAmount: 120000, targetDate: "2027-09", assumedReturnPercent: 6.5 }]);
    expect(skipped).toHaveLength(1);
  });

  it("reads readings and skips one that is not a number", () => {
    const { input, skipped } = parse({ snapshots: [{ taken_on: "2026-08-30", value: "7500000" }, { taken_on: "2026-08-31", value: "n/a" }, { taken_on: "bad", value: 1 }] });
    expect(input.snapshots).toEqual([{ takenOn: "2026-08-30", value: 7500000 }]);
    expect(skipped).toHaveLength(2);
  });
});

describe("tax inputs", () => {
  const inputs = { slabPercent: 30, ppf: 42000, elss: 30000, lifeInsurance: 22000, health80D: 14000, homeLoanInterestPaid: 551800 };

  it("uses the row for the current financial year, and no other", () => {
    const rows = [
      { financial_year: "2025-26", inputs: { ...inputs, ppf: 1 } },
      { financial_year: "2026-27", inputs },
    ];
    expect(parse({ tax: rows }).input.tax).toEqual(inputs);
    expect(parse({ tax: [rows[0]] }).input.tax).toBeUndefined();
  });

  it("treats a missing or bad figure as zero rather than failing", () => {
    expect(parse({ tax: [{ financial_year: "2026-27", inputs: { slabPercent: 30, ppf: "x", elss: -5 } }] }).input.tax).toEqual({ slabPercent: 30, ppf: 0, elss: 0, lifeInsurance: 0, health80D: 0, homeLoanInterestPaid: 0 });
  });
});

describe("market rates", () => {
  it("maps the known keys and takes the latest date", () => {
    expect(
      parseRates([
        { key: "home-loan-market", value: "8.5", as_of: "2026-09-20" },
        { key: "fd-12m", value: 7.1, as_of: "2026-09-29" },
        { key: "savings-rate", value: 3, as_of: "2026-09-01" },
      ]),
    ).toEqual({ homeLoan: 8.5, fixedDeposit12m: 7.1, savings: 3, asOf: "2026-09-29" });
  });

  it("ignores an unknown key, a negative rate and an absurd one", () => {
    expect(parseRates([{ key: "gold", value: 5, as_of: "2026-09-01" }, { key: "fd-12m", value: -1, as_of: "2026-09-01" }, { key: "savings-rate", value: 400, as_of: "2026-09-01" }])).toEqual({});
  });

  it("is empty with no rows", () => {
    expect(parseRates([])).toEqual({});
  });
});

describe("profile", () => {
  it("uses the full name, the first name and the city as given", () => {
    expect(parseProfile({ first_name: "Aarav", full_name: "Aarav Mehta", city: "Bengaluru" }, who)).toEqual({ id: "u1", name: "Aarav Mehta", firstName: "Aarav", city: "Bengaluru", email: "alice@example.com" });
  });

  it("falls back to the first name, then the email, for the name, and to the first word of the full name for the first name", () => {
    expect(parseProfile({ first_name: "Aarav", full_name: null, city: null }, who)).toMatchObject({ name: "Aarav", firstName: "Aarav", city: "" });
    expect(parseProfile({ first_name: null, full_name: "Aarav Mehta", city: null }, who)).toMatchObject({ name: "Aarav Mehta", firstName: "Aarav" });
    expect(parseProfile({ first_name: null, full_name: null, city: null }, who)).toMatchObject({ name: "alice@example.com", firstName: "" });
    expect(parseProfile(null, who)).toMatchObject({ name: "alice@example.com", firstName: "" });
    expect(parseProfile({ first_name: "  ", full_name: "  ", city: " " }, who)).toMatchObject({ name: "alice@example.com", firstName: "", city: "" });
  });
});

describe("a whole member", () => {
  it("carries the date and a clean profile, with nothing skipped when all is well", () => {
    const { input, skipped } = parse({});
    expect(input).toMatchObject({ asOf: "2026-09-29", accounts: [], monthly: [], goals: [], rates: {}, tax: undefined });
    expect(skipped).toEqual([]);
  });
});
