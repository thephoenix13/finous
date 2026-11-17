import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMockConsoleApi, type MockConsoleApi } from "../api/mock";
import { expectAccessible } from "../test/a11y";
import { renderConsole } from "../test/render";

const row = (name: string) => within(screen.getByRole("row", { name: new RegExp(name) }));

describe("Product catalogue (I5.1)", () => {
  it("lists the bank's products with rate, term, status and when each last changed", async () => {
    const { container } = renderConsole({ route: "/products" });
    expect(await screen.findByRole("heading", { name: "Products" })).toBeInTheDocument();
    expect(await screen.findAllByRole("row")).toHaveLength(6);
    const home = row("Home loan");
    expect(home.getByText("Loan")).toBeInTheDocument();
    expect(home.getByText("8.75% a year")).toBeInTheDocument();
    expect(home.getByText("5 years to 20 years")).toBeInTheDocument();
    expect(home.getByText("Live")).toBeInTheDocument();
    expect(home.getByText("2 Nov 2026")).toBeInTheDocument();
    expect(row("Vehicle loan").getByText("Draft")).toBeInTheDocument();
    expect(row("Fixed deposit").getByText("Deposit")).toBeInTheDocument();
    expect(row("Personal loan").getByText("1 year to 5 years")).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("says a Live product shows at once, and that approval is still to come", async () => {
    renderConsole({ route: "/products" });
    expect(await screen.findByText(/shows in the app as soon as you save it/)).toBeInTheDocument();
    expect(screen.getByText(/Compliance approval before a change goes live is still to come/)).toBeInTheDocument();
  });

  it("links each product to its editor, and Add a product to a blank one", async () => {
    renderConsole({ route: "/products" });
    expect(await screen.findByRole("link", { name: "Home loan" })).toHaveAttribute("href", "/products/p1/edit");
    expect(screen.getByRole("link", { name: "Add a product" })).toHaveAttribute("href", "/products/new");
  });

  it("filters by name as they type, ignoring case, and says when nothing matches", async () => {
    renderConsole({ route: "/products" });
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Search products"), "LOAN");
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(screen.queryByRole("link", { name: "Fixed deposit" })).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText("Search products"));
    await user.type(screen.getByLabelText("Search products"), "  zzz ");
    expect(screen.getByText('No product matches "zzz".')).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Search products"));
    expect(screen.getAllByRole("row")).toHaveLength(6);
  });

  it("finds a product however the capitals are typed, in the search or in the name", async () => {
    renderConsole({ route: "/products" });
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Search products"), "home");
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Home loan" })).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Search products"));
    await user.type(screen.getByLabelText("Search products"), "FIXED");
    expect(screen.getByRole("link", { name: "Fixed deposit" })).toBeInTheDocument();
  });

  it("invites a new bank to add its first product", async () => {
    renderConsole({ route: "/products", bank: "new" });
    expect(await screen.findByRole("heading", { name: "No products yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your first product" })).toHaveAttribute("href", "/products/new");
    expect(screen.queryByLabelText("Search products")).not.toBeInTheDocument();
  });

  it("says it could not load, and loads when they try again", async () => {
    const api = createMockConsoleApi();
    api.failNext("products");
    renderConsole({ route: "/products", api });
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("link", { name: "Home loan" })).toBeInTheDocument();
  });

  it("is open to Admin, Compliance and Marketing, and closed to Branch and Read-only", async () => {
    for (const as of ["admin", "compliance", "marketing"] as const) {
      const { unmount } = renderConsole({ route: "/products", as });
      expect(await screen.findByRole("heading", { name: "Products" })).toBeInTheDocument();
      unmount();
    }
    for (const as of ["branch", "readonly"] as const) {
      const { unmount } = renderConsole({ route: "/products", as });
      expect(await screen.findByRole("heading", { name: "You don't have access to Products" })).toBeInTheDocument();
      unmount();
    }
  });
});

async function openEditor(route: string, api?: MockConsoleApi) {
  const view = renderConsole({ route, api });
  await screen.findByLabelText("Product name");
  return { ...view, user: userEvent.setup() };
}

async function fillGood(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Product name"), "  Gold loan ");
  await user.selectOptions(screen.getByLabelText("Type"), "loan");
  await user.type(screen.getByLabelText("Rate"), "10.5");
  await user.type(screen.getByLabelText("Shortest term"), "3");
  await user.type(screen.getByLabelText("Longest term"), "36");
  await user.type(screen.getByLabelText("Who can have it"), "Open to individuals with gold to pledge.");
  await user.type(screen.getByLabelText("Fees"), "Processing fee 0.5%.");
  await user.type(screen.getByLabelText("Disclosure in English"), "Offered by the bank. Tap Learn more to talk to us.");
  await user.type(screen.getByLabelText("Disclosure in Hindi"), "बैंक की ओर से। बात करने के लिए अधिक जानें पर टैप करें।");
}

describe("Product editor (I5.2)", () => {
  it("starts blank for a new product, with a draft status and a placeholder preview", async () => {
    const { container } = await openEditor("/products/new");
    expect(screen.getByRole("heading", { name: "Add a product" })).toBeInTheDocument();
    expect(screen.getByLabelText("Product name")).toHaveValue("");
    expect(screen.getByRole("switch", { name: "Show in the app" })).not.toBeChecked();
    expect(screen.getByText(/Draft: customers don't see it yet/)).toBeInTheDocument();
    const preview = within(screen.getByRole("region", { name: "How it looks to a customer" }));
    expect(preview.getByText("Product name")).toBeInTheDocument();
    expect(preview.getByText("Your disclosure appears here.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add product" })).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("shows the preview as they type: name, rate, term, Learn more and the disclosure", async () => {
    const { user } = await openEditor("/products/new");
    await user.type(screen.getByLabelText("Product name"), "Gold loan");
    await user.type(screen.getByLabelText("Rate"), "10.5");
    await user.type(screen.getByLabelText("Shortest term"), "6");
    await user.type(screen.getByLabelText("Longest term"), "30");
    await user.type(screen.getByLabelText("Disclosure in English"), "Offered by the bank.");
    const preview = within(screen.getByRole("region", { name: "How it looks to a customer" }));
    expect(preview.getByRole("heading", { name: "Gold loan" })).toBeInTheDocument();
    expect(preview.getByText("10.5% a year, 6 months to 2 years 6 months")).toBeInTheDocument();
    expect(preview.getByText("Learn more")).toBeInTheDocument();
    expect(preview.getByText("Offered by the bank.")).toBeInTheDocument();
  });

  it("shows every problem at once on Save, saves nothing, and clears a problem when that field is fixed", async () => {
    const { user, api } = await openEditor("/products/new");
    await user.click(screen.getByRole("button", { name: "Add product" }));
    for (const text of [/Give the product a name/, /Choose loan or deposit./, /Enter the rate as a number/, /shortest term in whole months/, /longest term in whole months/, /Say who can have it/, /Say what it costs/, /Write the disclosure customers will read/, /write the disclosure in Hindi as well/]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(api.saved.products).toHaveLength(0);
    await user.type(screen.getByLabelText("Product name"), "Gold loan");
    expect(screen.queryByText(/Give the product a name/)).not.toBeInTheDocument();
    expect(screen.getByText(/Choose loan or deposit./)).toBeInTheDocument();
  });

  it("refuses a disclosure that says Apply", async () => {
    const { user } = await openEditor("/products/new");
    await fillGood(user);
    const en = screen.getByLabelText("Disclosure in English");
    await user.clear(en);
    await user.type(en, "Apply now at your nearest branch today.");
    await user.click(screen.getByRole("button", { name: "Add product" }));
    expect(await screen.findByText(/Say Learn more, not Apply/)).toBeInTheDocument();
  });

  it("requires the Hindi disclosure when the bank has Hindi on, and makes it optional when Hindi is off", async () => {
    const withHindi = await openEditor("/products/new");
    expect(screen.getByText(/Your app is in Hindi too, so customers will read this/)).toBeInTheDocument();
    withHindi.unmount();

    const api = createMockConsoleApi();
    await api.saveLanguages({ english: true, hindi: false, advisor: "rules" });
    const { user } = await openEditor("/products/new", api);
    expect(screen.getByLabelText("Disclosure in Hindi (optional)")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Product name"), "Gold loan");
    await user.selectOptions(screen.getByLabelText("Type"), "loan");
    await user.type(screen.getByLabelText("Rate"), "10.5");
    await user.type(screen.getByLabelText("Shortest term"), "3");
    await user.type(screen.getByLabelText("Longest term"), "36");
    await user.type(screen.getByLabelText("Who can have it"), "Open to individuals with gold to pledge.");
    await user.type(screen.getByLabelText("Fees"), "Processing fee 0.5%.");
    await user.type(screen.getByLabelText("Disclosure in English"), "Offered by the bank. Tap Learn more to talk to us.");
    await user.click(screen.getByRole("button", { name: "Add product" }));
    expect(await screen.findByRole("heading", { name: "Products" })).toBeInTheDocument();
    expect(api.saved.products[0].disclosureHi).toBe("");
  });

  it("adds a product with the numbers as numbers and the text trimmed, then lists it with a saved notice", async () => {
    const { user, api } = await openEditor("/products/new");
    await fillGood(user);
    await user.click(screen.getByRole("switch", { name: "Show in the app" }));
    expect(screen.getByText(/Live: customers see it as soon as you save/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add product" }));
    expect(await screen.findByText("Saved Gold loan.")).toBeInTheDocument();
    expect(api.saved.products[0]).toMatchObject({ name: "Gold loan", kind: "loan", rate: 10.5, tenureMin: 3, tenureMax: 36, live: true });
    expect(row("Gold loan").getByText("Live")).toBeInTheDocument();
    expect(await screen.findAllByRole("row")).toHaveLength(7);
  });

  it("opens an existing product filled in, and saves a change to it under the same name and id", async () => {
    const { user, api } = await openEditor("/products/p3/edit");
    expect(screen.getByRole("heading", { name: "Edit product" })).toBeInTheDocument();
    expect(screen.getByLabelText("Product name")).toHaveValue("Vehicle loan");
    expect(screen.getByLabelText("Type")).toHaveValue("loan");
    expect(screen.getByLabelText("Rate")).toHaveValue("9.5");
    expect(screen.getByLabelText("Shortest term")).toHaveValue("12");
    expect(screen.getByRole("switch", { name: "Show in the app" })).not.toBeChecked();
    await user.type(screen.getByLabelText("Disclosure in Hindi"), "बैंक की ओर से। बात करने के लिए अधिक जानें पर टैप करें।");
    await user.click(screen.getByRole("switch", { name: "Show in the app" }));
    await user.click(screen.getByRole("button", { name: "Save product" }));
    expect(await screen.findByText("Saved Vehicle loan.")).toBeInTheDocument();
    expect(api.saved.products[0]).toMatchObject({ id: "p3", live: true });
    expect(row("Vehicle loan").getByText("Live")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(6);
  });

  it("says it can't find a product that isn't there, with a way back", async () => {
    renderConsole({ route: "/products/nope/edit" });
    expect(await screen.findByText(/We can't find that product/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the products" })).toHaveAttribute("href", "/products");
  });

  it("keeps what they typed and says so when the save fails, then saves on a retry", async () => {
    const api = createMockConsoleApi();
    const { user } = await openEditor("/products/new", api);
    await fillGood(user);
    api.failNext("saveProduct");
    await user.click(screen.getByRole("button", { name: "Add product" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your changes are still here");
    expect(screen.getByLabelText("Rate")).toHaveValue("10.5");
    await user.click(screen.getByRole("button", { name: "Add product" }));
    expect(await screen.findByText("Saved Gold loan.")).toBeInTheDocument();
  });

  it("says it could not load, and loads when they try again", async () => {
    const api = createMockConsoleApi();
    api.failNext("languages");
    renderConsole({ route: "/products/new", api });
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByLabelText("Product name")).toBeInTheDocument();
  });
});
