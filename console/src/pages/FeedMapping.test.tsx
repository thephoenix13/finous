import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMockConsoleApi, type MockConsoleApi } from "../api/mock";
import { expectAccessible } from "../test/a11y";
import { renderConsole } from "../test/render";

const ROUTE = "/settings/integration/mapping";

async function open(options: { bank?: "demo" | "new"; api?: MockConsoleApi } = {}) {
  const view = renderConsole({ route: ROUTE, ...options });
  await screen.findByLabelText("Customer number");
  return { ...view, user: userEvent.setup() };
}

const REQUIRED: [string, string][] = [
  ["Customer number", "CUST_NO"],
  ["Customer name", "CUST_NAME"],
  ["Account number", "ACCT_NO"],
  ["Account type", "ACCT_TYPE"],
  ["Balance or amount outstanding", "BAL_AMT"],
];

describe("Feed mapping and test (I7.5)", () => {
  it("shows the demo bank's matching, all done, and is accessible", async () => {
    const { container } = await open();
    expect(screen.getByLabelText("Customer number")).toHaveValue("CUST_NO");
    expect(screen.getByLabelText("Balance or amount outstanding")).toHaveValue("BAL_AMT");
    expect(screen.getByLabelText("Branch")).toHaveValue("BR_CODE");
    expect(screen.getByText(/Everything required is matched\. 10 columns will be read\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run a test" })).toBeEnabled();
    await expectAccessible(container);
  });

  it("marks which fields are required, and explains each one", async () => {
    await open();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(10);
    expect(within(rows[0]).getByText("Required")).toBeInTheDocument();
    expect(within(rows[5]).queryByText("Required")).not.toBeInTheDocument();
    expect(screen.getByText(/Kept masked\. Only the last 4 digits are ever shown\./)).toBeInTheDocument();
  });

  it("lists the file's columns to choose from, including ones nobody needs", async () => {
    await open();
    const options = within(screen.getByLabelText("Customer number")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Not matched", "CUST_NO", "CUST_NAME", "ACCT_NO", "ACCT_TYPE", "BAL_AMT", "EMI_AMT", "ROI", "NEXT_DUE_DT", "MAT_DT", "BR_CODE", "PHONE"]);
  });

  it("runs a test and says how many rows were accepted, which were left out and why, and shows the first customer", async () => {
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: "Run a test" }));
    expect(await screen.findByText("Test finished: 4 of 5 rows accepted, 1 left out.")).toBeInTheDocument();
    expect(screen.getByText("Row 4: Balance or amount outstanding is empty.")).toBeInTheDocument();
    const preview = screen.getByRole("heading", { name: /first accepted customer/ }).parentElement!;
    expect(within(preview).getByText("Rohit K.")).toBeInTheDocument();
    expect(within(preview).getByText("••••8812")).toBeInTheDocument();
    expect(within(preview).getByText("₹28,50,000")).toBeInTheDocument();
    // The result is announced: it sits in a live region.
    expect(screen.getByText(/Test finished/).closest("[role='status']")).not.toBeNull();
  });

  it("never shows a phone number, because that column isn't matched", async () => {
    const { user, container } = await open();
    await user.click(screen.getByRole("button", { name: "Run a test" }));
    await screen.findByText(/Test finished/);
    expect(container.textContent).not.toContain("9000000001");
  });

  it("starts a new bank with nothing matched, says what is still needed, and won't test yet", async () => {
    await open({ bank: "new" });
    expect(screen.getByText(/Still to match: Customer number, Customer name, Account number, Account type, Balance or amount outstanding\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run a test" })).toBeDisabled();
    expect(screen.getByText("Match every required column first.")).toBeInTheDocument();
  });

  it("counts down what is left as columns are matched, and tests once the last is", async () => {
    const { user } = await open({ bank: "new" });
    for (const [label, column] of REQUIRED.slice(0, 4)) await user.selectOptions(screen.getByLabelText(label), column);
    expect(screen.getByText("Still to match: Balance or amount outstanding.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run a test" })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText(REQUIRED[4][0]), REQUIRED[4][1]);
    expect(screen.getByText(/Everything required is matched\. 5 columns will be read\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run a test" })).toBeEnabled();
  });

  it("saves the matching without the empty choices, and says so", async () => {
    const { user, api } = await open({ bank: "new" });
    for (const [label, column] of REQUIRED) await user.selectOptions(screen.getByLabelText(label), column);
    await user.selectOptions(screen.getByLabelText("Interest rate"), "ROI");
    await user.selectOptions(screen.getByLabelText("Interest rate"), "");
    await user.click(screen.getByRole("button", { name: "Save mapping" }));
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(api.saved.mappings).toEqual([{ customerRef: "CUST_NO", customerName: "CUST_NAME", accountNumber: "ACCT_NO", accountType: "ACCT_TYPE", balance: "BAL_AMT" }]);
  });

  it("lets them save progress before every required column is matched", async () => {
    const { user, api } = await open({ bank: "new" });
    await user.selectOptions(screen.getByLabelText("Customer number"), "CUST_NO");
    await user.click(screen.getByRole("button", { name: "Save mapping" }));
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(api.saved.mappings).toEqual([{ customerRef: "CUST_NO" }]);
  });

  it("flags one column given to two things, on both, and blocks saving and testing until it's fixed", async () => {
    const { user, api } = await open();
    await user.selectOptions(screen.getByLabelText("Customer name"), "CUST_NO");
    expect(screen.getByText("Also used for Customer name.")).toBeInTheDocument();
    expect(screen.getByText("Also used for Customer number.")).toBeInTheDocument();
    expect(screen.getByLabelText("Customer name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Save mapping" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Run a test" })).toBeDisabled();
    expect(screen.getByText("Give each column to one thing only.")).toBeInTheDocument();
    expect(api.saved.mappings).toHaveLength(0);
    await user.selectOptions(screen.getByLabelText("Customer name"), "CUST_NAME");
    expect(screen.queryByText(/Also used for/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save mapping" })).toBeEnabled();
  });

  it("forgets an old test result as soon as the matching changes", async () => {
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: "Run a test" }));
    await screen.findByText(/Test finished/);
    await user.selectOptions(screen.getByLabelText("Branch"), "");
    expect(screen.queryByText(/Test finished/)).not.toBeInTheDocument();
  });

  it("clears the saved message when they change the matching again", async () => {
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: "Save mapping" }));
    await screen.findByText("Saved.");
    await user.selectOptions(screen.getByLabelText("Branch"), "");
    expect(screen.queryByText("Saved.")).not.toBeInTheDocument();
  });

  it("keeps their matching and says so when the save fails", async () => {
    const api = createMockConsoleApi();
    const { user } = await open({ api });
    await user.selectOptions(screen.getByLabelText("Branch"), "");
    api.failNext("saveFeedMapping");
    await user.click(screen.getByRole("button", { name: "Save mapping" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your changes are still here");
    expect(screen.getByLabelText("Branch")).toHaveValue("");
  });

  it("says the test couldn't run, changes nothing, and runs on a retry", async () => {
    const api = createMockConsoleApi();
    const { user } = await open({ api });
    api.failNext("dryRun");
    await user.click(screen.getByRole("button", { name: "Run a test" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The test couldn't run just now");
    expect(api.saved.mappings).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Run a test" }));
    await waitFor(() => expect(screen.getByText(/Test finished/)).toBeInTheDocument());
    expect(screen.queryByText("The test couldn't run just now. Nothing was changed. Try again.")).not.toBeInTheDocument();
  });

  it("tests the matching as it stands on screen, not only what was saved", async () => {
    const { user, api } = await open({ bank: "new" });
    for (const [label, column] of REQUIRED) await user.selectOptions(screen.getByLabelText(label), column);
    await user.click(screen.getByRole("button", { name: "Run a test" }));
    expect(await screen.findByText("Test finished: 4 of 5 rows accepted, 1 left out.")).toBeInTheDocument();
    expect(api.saved.mappings).toHaveLength(0);
  });

  it("says it could not load, and loads when they try again", async () => {
    const api = createMockConsoleApi();
    api.failNext("feedMapping");
    renderConsole({ route: ROUTE, api });
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByLabelText("Customer number")).toBeInTheDocument();
  });
});
