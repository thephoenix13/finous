// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockApi } from "../api";
import { renderWithI18n } from "../test/renderWithI18n";
import { buildContext } from "../lib/advisor";
import { askAi } from "../lib/advisorAi";
import Advisor from "./Advisor";

type Sent = { question: string; lang: string; context: Record<string, unknown>; history: { from: string; text: string }[] };

let sent: Sent[];
let answer: () => Response | Promise<Response>;
beforeEach(() => {
  sent = [];
  answer = () => new Response(JSON.stringify({ text: "AI says: you owe ₹62,00,000.", sources: ["HDFC Home Loan"] }), { status: 200 });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)));
      return answer();
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const suggestion = (name: string) => screen.findByRole("button", { name });
const log = () => within(screen.getByRole("log", { name: "Conversation" }));

describe("Advisor with the AI", () => {
  it("shows the AI's answer and its sources, with no 'fixed rules' note", async () => {
    renderWithI18n(<Advisor />);
    await userEvent.click(await suggestion("Should I prepay my home loan?"));
    expect(await log().findByText("AI says: you owe ₹62,00,000.")).toBeInTheDocument();
    expect(log().getByText("Based on HDFC Home Loan")).toBeInTheDocument();
    expect(screen.queryByText(/worked out from your figures by fixed rules/)).not.toBeInTheDocument();
  });

  it("posts the question, the language and the user's own figures to /api/advisor", async () => {
    renderWithI18n(<Advisor />);
    await userEvent.click(await suggestion("Should I prepay my home loan?"));
    await log().findByText(/AI says/);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/advisor");
    expect(sent[0].question).toBe("Should I prepay my home loan?");
    expect(sent[0].lang).toBe("en");
    expect(sent[0].history).toEqual([]);
    expect(sent[0].context).toMatchObject({ saved: 53600, outflow: 186400, month: "Sep 2026" });
  });

  it("keeps the rules' link to the right tool next to the AI's words", async () => {
    renderWithI18n(<Advisor />);
    await userEvent.click(await suggestion("Should I prepay my home loan?"));
    expect(await log().findByRole("link", { name: "Open the prepay calculator" })).toHaveAttribute("href", "/plans/prepay");
  });

  it("sends the earlier turns with the next question, so a follow-up has context", async () => {
    renderWithI18n(<Advisor />);
    await userEvent.click(await suggestion("Should I prepay my home loan?"));
    await log().findByText(/AI says/);
    await userEvent.type(screen.getByRole("textbox", { name: "Ask the advisor" }), "What would you do?{Enter}");
    await waitFor(() => expect(sent).toHaveLength(2));
    expect(sent[1].history).toEqual([
      { from: "user", text: "Should I prepay my home loan?" },
      { from: "advisor", text: "AI says: you owe ₹62,00,000." },
    ]);
  });

  it("tells the server the app is in Hindi", async () => {
    renderWithI18n(<Advisor />, { lng: "hi" });
    await userEvent.click(await suggestion("इस महीने मेरा सबसे बड़ा खर्च क्या है?"));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].lang).toBe("hi");
  });

  it("says it is thinking, and will not take a second question until the first is answered", async () => {
    let release!: (r: Response) => void;
    answer = () => new Promise<Response>((resolve) => (release = resolve));
    renderWithI18n(<Advisor />);
    await userEvent.click(await suggestion("Should I prepay my home loan?"));
    expect(await screen.findByText("Thinking…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    release(new Response(JSON.stringify({ text: "Done.", sources: [] }), { status: 200 }));
    expect(await log().findByText("Done.")).toBeInTheDocument();
    expect(screen.queryByText("Thinking…")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });
});

describe("Advisor when the AI cannot answer", () => {
  it.each([
    ["no key (503)", () => new Response("{}", { status: 503 })],
    ["a rate limit (429)", () => new Response("{}", { status: 429 })],
    ["an empty answer", () => new Response(JSON.stringify({ text: "  " }), { status: 200 })],
  ])("falls back to the rules for %s, and says so", async (_name, make) => {
    answer = make;
    renderWithI18n(<Advisor />);
    await userEvent.click(await suggestion("Can I afford a ₹40L car?"));
    expect(await log().findByText(/You save ₹53,600 a month today\./)).toBeInTheDocument();
    expect(log().getByText("The AI could not answer, so this was worked out from your figures by fixed rules.")).toBeInTheDocument();
  });

  it("falls back when the network fails outright, and can then ask again", async () => {
    answer = () => Promise.reject(new Error("offline"));
    renderWithI18n(<Advisor />);
    await userEvent.click(await suggestion("How much did I spend on food this month?"));
    expect(await log().findByText(/You spent ₹18,200 on food/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });
});

describe("askAi and buildContext", () => {
  const data = async () => {
    const api = createMockApi();
    return { cashFlow: await api.getCashFlow(), accounts: await api.listAccounts() };
  };

  it("builds a context of names, amounts and rates, including each account's last four digits", async () => {
    const context = buildContext(await data(), "en");
    expect(context.bankAccounts).toEqual([
      { name: "HDFC Bank •4821", balance: 284000 },
      { name: "State Bank of India •7723", balance: 136000 },
    ]);
    expect(context.loans).toEqual([expect.objectContaining({ name: "HDFC Home Loan", outstanding: 6_200_000, ratePercent: 8.9 })]);
    expect(context.diningAboveAverage).toEqual({ percent: 22, months: 6 });
  });

  it("rejects on a bad status and on an answer with no text", async () => {
    const input = { question: "q", lang: "en" as const, data: await data(), history: [] };
    await expect(askAi(input, (async () => new Response("{}", { status: 500 })) as typeof fetch)).rejects.toThrow("advisor 500");
    await expect(askAi(input, (async () => new Response(JSON.stringify({ sources: [] }), { status: 200 })) as typeof fetch)).rejects.toThrow("empty");
  });

  it("returns the text, and only the sources that are text", async () => {
    const input = { question: "q", lang: "en" as const, data: await data(), history: [] };
    const out = await askAi(input, (async () => new Response(JSON.stringify({ text: "Hi", sources: ["A", 2] }), { status: 200 })) as typeof fetch);
    expect(out).toEqual({ text: "Hi", sources: ["A"] });
  });
});
