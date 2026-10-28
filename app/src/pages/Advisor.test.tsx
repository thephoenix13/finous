// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError, createMockApi, type AccountsOverview, type Api } from "../api";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import Advisor from "./Advisor";

const ready = () => screen.findByRole("button", { name: "What's my biggest expense this month?" });
const log = () => within(screen.getByRole("log", { name: "Conversation" }));
const box = () => screen.getByRole("textbox", { name: "Ask the advisor" });

describe("Advisor: empty (prototype advisor)", () => {
  it("opens with a heading, what it does and four starting questions", async () => {
    renderWithI18n(<Advisor />);
    await ready();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ask about your money.");
    expect(screen.getByText("Finous reads your accounts and answers. Every answer names what it used.")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "What's my biggest expense this month?",
      "Should I prepay my home loan?",
      "How much did I spend on food this month?",
      "Can I afford a ₹40L car?",
    ]);
  });

  it("says plainly that the answers are not from an AI model, and that this is not advice", async () => {
    renderWithI18n(<Advisor />);
    await ready();
    expect(screen.getByText("Demo answers: worked out from your figures, not by an AI model.")).toBeInTheDocument();
    expect(screen.getByText(/not investment advice/)).toBeInTheDocument();
  });
});

describe("Advisor: the suggested questions", () => {
  it("names the biggest expense with its share of what went out, citing the cash flow", async () => {
    renderWithI18n(<Advisor />);
    await userEvent.click(await ready());
    expect(log().getByText("Your biggest expense this month is EMI: ₹58,345 of the ₹1,86,400 that went out.")).toBeInTheDocument();
    expect(log().getByText("Based on Cash flow, Sep 2026")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("answers the prepay question from the loan, the savings and the buffer, with a link to the calculator and every source", async () => {
    renderWithI18n(<Advisor />);
    await userEvent.click(await screen.findByRole("button", { name: "Should I prepay my home loan?" }));
    expect(log().getByText(/You owe ₹62,00,000 on HDFC Home Loan at 8.9%, and hold ₹4,20,000 in savings\./)).toBeInTheDocument();
    expect(log().getByText(/That covers about 3.5 months of essential expenses/)).toBeInTheDocument();
    expect(log().getByRole("link", { name: "Open the prepay calculator" })).toHaveAttribute("href", "/plans/prepay");
    expect(log().getByText("Based on HDFC Home Loan · HDFC Bank •4821 · State Bank of India •7723 · Essentials ₹1,19,145/month")).toBeInTheDocument();
  });

  it("answers the food question, with the dining comparison", async () => {
    renderWithI18n(<Advisor />);
    await userEvent.click(await screen.findByRole("button", { name: "How much did I spend on food this month?" }));
    expect(log().getByText("You spent ₹18,200 on food and dining this month. That is 22% above your 6-month average.")).toBeInTheDocument();
  });

  it("answers the car question with what is saved each month and a link to the check", async () => {
    renderWithI18n(<Advisor />);
    await userEvent.click(await screen.findByRole("button", { name: "Can I afford a ₹40L car?" }));
    expect(log().getByText(/You save ₹53,600 a month today\./)).toBeInTheDocument();
    expect(log().getByRole("link", { name: "Open the affordability check" })).toHaveAttribute("href", "/plans/afford");
  });
});

describe("Advisor: typing a question", () => {
  it("answers a typed question about a topic it knows, and clears the box", async () => {
    renderWithI18n(<Advisor />);
    await ready();
    await userEvent.type(box(), "how much on swiggy?{Enter}");
    expect(log().getByText("how much on swiggy?")).toBeInTheDocument();
    expect(log().getByText(/You spent ₹18,200 on food/)).toBeInTheDocument();
    expect(box()).toHaveValue("");
  });

  it("keeps the conversation going, oldest first", async () => {
    renderWithI18n(<Advisor />);
    await userEvent.click(await ready());
    await userEvent.type(box(), "should I prepay?");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    const text = screen.getByRole("log").textContent ?? "";
    expect(text.indexOf("biggest expense")).toBeLessThan(text.indexOf("You owe"));
  });

  it("says what it can answer when it has no answer, with no sources", async () => {
    renderWithI18n(<Advisor />);
    await ready();
    await userEvent.type(box(), "what is the weather{Enter}");
    expect(log().getByText(/I can answer questions about your biggest expense/)).toBeInTheDocument();
    expect(log().queryByText(/^Based on/)).not.toBeInTheDocument();
  });

  it("ignores an empty or blank question", async () => {
    renderWithI18n(<Advisor />);
    await ready();
    await userEvent.type(box(), "   {Enter}");
    expect(screen.queryByRole("log")).not.toBeInTheDocument();
  });

  it("says there is nothing to prepay when no loan is linked", async () => {
    const base = createMockApi();
    const api: Api = { ...base, listAccounts: async (o): Promise<AccountsOverview> => ({ ...(await base.listAccounts(o)), loans: [] }) };
    renderWithI18n(<Advisor />, { api });
    await userEvent.click(await screen.findByRole("button", { name: "Should I prepay my home loan?" }));
    expect(log().getByText("You have no home loan linked, so there is nothing to prepay.")).toBeInTheDocument();
  });

  it("labels who spoke, for a screen reader", async () => {
    renderWithI18n(<Advisor />);
    await userEvent.click(await ready());
    expect(log().getByText("You:")).toHaveClass("sr-only");
    expect(log().getByText("Advisor:")).toHaveClass("sr-only");
  });
});

describe("Advisor: reading the user's own data", () => {
  it("shows the loading block, and will not send until the data is there", () => {
    const stuck: Api = { ...createMockApi(), getCashFlow: () => new Promise<never>(() => {}) };
    renderWithI18n(<Advisor />, { api: stuck });
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("offers a retry when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<Advisor />, { api });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await ready();
  });
});

describe("Advisor: Hindi and accessibility", () => {
  it("is translated, and answers in Hindi", async () => {
    renderWithI18n(<Advisor />, { lng: "hi" });
    await userEvent.click(await screen.findByRole("button", { name: "इस महीने मेरा सबसे बड़ा खर्च क्या है?" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("अपने पैसों के बारे में पूछिए।");
    expect(within(screen.getByRole("log", { name: "बातचीत" })).getByText("इस महीने आपका सबसे बड़ा खर्च ईएमआई है: कुल ₹1,86,400 में से ₹58,345।")).toBeInTheDocument();
  });

  it("answers a typed Hindi question", async () => {
    renderWithI18n(<Advisor />, { lng: "hi" });
    await screen.findAllByRole("listitem");
    await userEvent.type(screen.getByRole("textbox", { name: "सलाहकार से पूछें" }), "खाने पर कितना गया{Enter}");
    expect(await screen.findByText(/₹18,200 खर्च किया/)).toBeInTheDocument();
  });

  it.each([["en"], ["hi"]] as const)("has no accessibility violations, empty and in conversation, in %s", async (lng) => {
    const { container } = renderWithI18n(<Advisor />, { lng });
    const first = (await screen.findAllByRole("listitem"))[0].querySelector("button")!;
    await expectAccessible(container);
    await userEvent.click(first);
    await screen.findByRole("log");
    await expectAccessible(container);
  });
});
