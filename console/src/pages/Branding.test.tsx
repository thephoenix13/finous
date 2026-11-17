import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMockConsoleApi, type MockConsoleApi } from "../api/mock";
import { expectAccessible } from "../test/a11y";
import { renderConsole } from "../test/render";

const ROUTE = "/settings/app/branding";
const preview = () => within(screen.getByRole("region", { name: "Preview of the customer app" }));

async function open(api?: MockConsoleApi) {
  const view = renderConsole({ route: ROUTE, api });
  await screen.findByLabelText("Bank name");
  return { ...view, user: userEvent.setup({ applyAccept: false }) };
}

const file = (name: string, type: string, size = 100) => {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
};

describe("Branding (I7.1)", () => {
  it("shows what the bank has now, with the customer app's first screen beside it", async () => {
    const { container } = await open();
    expect(screen.getByLabelText("Bank name")).toHaveValue("Demo Co-operative Bank");
    expect(screen.getByLabelText("Brand colour")).toHaveValue("#0B6E4F");
    expect(screen.getByLabelText("Text colour on brand colour")).toHaveValue("#FFFFFF");
    expect(preview().getByText("Demo Co-operative Bank")).toBeInTheDocument();
    expect(preview().getByText(/Offers shown are from Demo Co-operative Bank/)).toBeInTheDocument();
    expect(preview().getByText("Powered by Finous")).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("updates the preview as they type", async () => {
    const { user } = await open();
    const name = screen.getByLabelText("Bank name");
    await user.clear(name);
    await user.type(name, "Sahyadri Seva Bank");
    expect(preview().getByText("Sahyadri Seva Bank")).toBeInTheDocument();
    const disclaimer = screen.getByLabelText("Disclaimer");
    await user.clear(disclaimer);
    await user.type(disclaimer, "Information only, not advice.");
    expect(preview().getByText("Information only, not advice.")).toBeInTheDocument();
  });

  it("shows the first letter of the name as the mark until a logo is uploaded", async () => {
    await open();
    expect(preview().getByText("D")).toBeInTheDocument();
  });

  it("blocks text that is hard to read on the brand colour, at once, and says why", async () => {
    const { user } = await open();
    const on = screen.getByLabelText("Text colour on brand colour");
    await user.clear(on);
    await user.type(on, "#1F7F5F");
    expect(await screen.findByText(/Text on your brand colour has a contrast of/)).toBeInTheDocument();
    expect(on).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("lets them save again once the pair is readable", async () => {
    const { user } = await open();
    const on = screen.getByLabelText("Text colour on brand colour");
    await user.clear(on);
    await user.type(on, "#1F7F5F");
    await screen.findByText(/contrast of/);
    await user.clear(on);
    await user.type(on, "#FFFFFF");
    await waitFor(() => expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled());
    expect(screen.queryByText(/contrast of/)).not.toBeInTheDocument();
  });

  it("blocks a brand colour that is too pale for the app's background", async () => {
    const { user } = await open();
    const brand = screen.getByLabelText("Brand colour");
    await user.clear(brand);
    await user.type(brand, "#E8C547");
    expect(await screen.findByText(/too pale against the app's background/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("takes a colour from the picker too", async () => {
    await open();
    fireEvent.change(screen.getByLabelText("Pick brand colour"), { target: { value: "#123456" } });
    expect(screen.getByLabelText("Brand colour")).toHaveValue("#123456");
  });

  it("tidies a typed colour to one spelling when they leave the box", async () => {
    const { user } = await open();
    const brand = screen.getByLabelText("Brand colour");
    await user.clear(brand);
    await user.type(brand, "063");
    await user.tab();
    expect(brand).toHaveValue("#006633");
  });

  it("saves, trimming the text and spelling colours one way, and says so", async () => {
    const { user, api } = await open();
    const name = screen.getByLabelText("Bank name");
    await user.clear(name);
    await user.type(name, "  Sahyadri Seva Bank  ");
    const brand = screen.getByLabelText("Brand colour");
    await user.clear(brand);
    await user.type(brand, "1e5eff");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(api.saved.branding).toEqual([
      expect.objectContaining({ name: "Sahyadri Seva Bank", brandColour: "#1E5EFF", onBrandColour: "#FFFFFF", logo: null }),
    ]);
  });

  it("saves once, however many times Save is pressed while it is working", async () => {
    const base = createMockConsoleApi();
    // The save stays open until the test lets it finish, so the double press always lands while it is working.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let started = 0;
    const slow: MockConsoleApi = {
      ...base,
      saveBranding: async (b) => {
        started += 1;
        await gate;
        return base.saveBranding(b);
      },
    };
    const { user } = await open(slow);
    const save = screen.getByRole("button", { name: "Save changes" });
    await user.dblClick(save);
    expect(save).toHaveAttribute("aria-busy", "true");
    expect(save).toBeDisabled();
    release();
    await screen.findByText("Saved.");
    expect(started).toBe(1);
    expect(base.saved.branding).toHaveLength(1);
  });

  it("clears the saved message when they change something again", async () => {
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Saved.");
    await user.type(screen.getByLabelText("Bank name"), "!");
    expect(screen.queryByText("Saved.")).not.toBeInTheDocument();
  });

  it("keeps what they typed and says so when the save fails, then saves on a retry", async () => {
    const api = createMockConsoleApi();
    const { user } = await open(api);
    const name = screen.getByLabelText("Bank name");
    await user.clear(name);
    await user.type(name, "Kept Bank");
    api.failNext("saveBranding");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't save that. Your changes are still here.");
    expect(name).toHaveValue("Kept Bank");
    expect(api.saved.branding).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(api.saved.branding[0].name).toBe("Kept Bank");
  });

  it("asks for the name and disclaimer when Save is pressed without them, and saves nothing", async () => {
    const { user, api } = await open();
    await user.clear(screen.getByLabelText("Bank name"));
    await user.clear(screen.getByLabelText("Disclaimer"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/Enter your bank's name/)).toBeInTheDocument();
    expect(screen.getByText(/Write the disclaimer customers will see/)).toBeInTheDocument();
    expect(api.saved.branding).toHaveLength(0);
  });

  it("waits to complain about the name until they leave the box", async () => {
    const { user } = await open();
    const name = screen.getByLabelText("Bank name");
    await user.clear(name);
    expect(screen.queryByText(/Enter your bank's name/)).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByText(/Enter your bank's name/)).toBeInTheDocument();
  });

  describe("logo", () => {
    it("shows an uploaded logo in the preview, and can take it away", async () => {
      const { user, container } = await open();
      await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, file("logo.png", "image/png"));
      await waitFor(() => expect(container.querySelector('section[aria-label="Preview of the customer app"] img')).toHaveAttribute("src", expect.stringContaining("data:image/png")));
      expect(screen.getByText("Replace logo")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Remove logo" }));
      expect(container.querySelector("section img")).toBeNull();
      expect(screen.getByText("Upload logo")).toBeInTheDocument();
    });

    it("saves the logo with the rest", async () => {
      const { user, container, api } = await open();
      await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, file("logo.svg", "image/svg+xml"));
      await waitFor(() => expect(screen.getByText("Replace logo")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Save changes" }));
      await screen.findByText("Saved.");
      expect(api.saved.branding[0].logo).toContain("data:image/svg+xml");
    });

    it("refuses a file of the wrong type, with the reason", async () => {
      const { user, container } = await open();
      await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, file("logo.pdf", "application/pdf"));
      expect(await screen.findByRole("alert")).toHaveTextContent("Use a PNG, JPEG or SVG file.");
      expect(screen.getByText("Upload logo")).toBeInTheDocument();
    });

    it("refuses a file that is too big", async () => {
      const { user, container } = await open();
      await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, file("big.png", "image/png", 600 * 1024));
      expect(await screen.findByRole("alert")).toHaveTextContent("under 512 KB");
    });

    it("clears the complaint once a good file arrives", async () => {
      const { user, container } = await open();
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file("logo.pdf", "application/pdf"));
      await screen.findByRole("alert");
      await user.upload(input, file("logo.png", "image/png"));
      await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    });
  });

  it("says it could not load, and loads when they try again", async () => {
    const api = createMockConsoleApi();
    api.failNext("branding");
    renderConsole({ route: ROUTE, api });
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByLabelText("Bank name")).toBeInTheDocument();
  });

  it("links to the other two settings screens", async () => {
    await open();
    const tabs = screen.getByRole("navigation", { name: "Branding and app" });
    expect(within(tabs).getByRole("link", { name: "Branding" })).toHaveAttribute("aria-current", "page");
    await userEvent.click(within(tabs).getByRole("link", { name: "Languages and advisor" }));
    expect(await screen.findByRole("group", { name: "Advisor" })).toBeInTheDocument();
  });
});
