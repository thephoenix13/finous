// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createI18n, type Language } from "../i18n";
import { parseBranding, type BankBranding } from "./branding";
import { BankProvider, useAdvisorMode, useAllowedLanguages, useBank } from "./BankProvider";
import type { BankLookup } from "./lookup";

const make = (over: Record<string, unknown> = {}): BankBranding =>
  parseBranding({
    id: "b1",
    subdomain: "seva",
    name: "Seva Co-operative Bank",
    install_name: "Seva Money",
    logo: null,
    brand_colour: "#0F6B4A",
    on_brand_colour: "#FFFFFF",
    disclaimer: "Regulated by the RBI. Not investment advice.",
    english: true,
    hindi: true,
    advisor: "rules",
    ...over,
  })!;

/** What the app would see: the bank, the languages, the advisor, and a marker so a test can tell the children rendered. */
function Probe() {
  const bank = useBank();
  const languages = useAllowedLanguages();
  const advisor = useAdvisorMode();
  return (
    <p>
      app:{bank ? bank.name : "none"}|{languages.join(",")}|{advisor}
    </p>
  );
}

function open(ui: ReactNode, lng: Language = "en") {
  const i18n = createI18n(lng);
  return { i18n, ...render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>) };
}

const HOST = "seva.app.finous.site";
afterEach(() => {
  document.head.innerHTML = "";
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-tenant");
  document.title = "";
});

describe("on Finous's own address", () => {
  it("shows the app at once, with no bank, and never looks one up", () => {
    const lookup = vi.fn<BankLookup>();
    open(
      <BankProvider host="app.finous.site" lookup={lookup}>
        <Probe />
      </BankProvider>,
    );
    expect(screen.getByText("app:none|en,hi|ai")).toBeInTheDocument();
    expect(lookup).not.toHaveBeenCalled();
    expect(document.documentElement).not.toHaveAttribute("data-tenant");
  });

  it("is the same on a developer's machine without a bank in the address", () => {
    open(
      <BankProvider host="localhost" lookup={null}>
        <Probe />
      </BankProvider>,
    );
    expect(screen.getByText("app:none|en,hi|ai")).toBeInTheDocument();
  });
});

describe("on a bank's address", () => {
  it("shows nothing of the app until the bank is known, then the app as that bank", async () => {
    let resolve!: (bank: BankBranding) => void;
    const lookup = vi.fn<BankLookup>(() => new Promise((r) => (resolve = r)));
    open(
      <BankProvider host={HOST} lookup={lookup}>
        <Probe />
      </BankProvider>,
    );
    expect(lookup).toHaveBeenCalledWith("seva");
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText(/^app:/)).not.toBeInTheDocument();
    expect(document.title).not.toBe("Seva Co-operative Bank");

    await act(async () => resolve(make()));
    expect(await screen.findByText("app:Seva Co-operative Bank|en,hi|rules")).toBeInTheDocument();
    expect(document.title).toBe("Seva Co-operative Bank");
    expect(document.documentElement.style.getPropertyValue("--brand")).toBe("#0F6B4A");
  });

  it("puts the page back when it goes away", async () => {
    document.title = "Finous";
    const { unmount } = open(
      <BankProvider host={HOST} lookup={async () => make()}>
        <Probe />
      </BankProvider>,
    );
    await screen.findByText(/^app:Seva/);
    unmount();
    expect(document.title).toBe("Finous");
    expect(document.documentElement.style.getPropertyValue("--brand")).toBe("");
  });

  it("says the address is not available, and shows no app, when there is no live bank", async () => {
    open(
      <BankProvider host={HOST} lookup={async () => null}>
        <Probe />
      </BankProvider>,
    );
    expect(await screen.findByRole("heading", { name: "This address isn't available" })).toBeInTheDocument();
    expect(screen.queryByText(/^app:/)).not.toBeInTheDocument();
    expect(document.documentElement).not.toHaveAttribute("data-tenant");
  });

  it("says so too when this build has no way to look a bank up", async () => {
    open(
      <BankProvider host={HOST} lookup={null}>
        <Probe />
      </BankProvider>,
    );
    expect(await screen.findByRole("heading", { name: "This address isn't available" })).toBeInTheDocument();
  });

  it("offers a retry when the lookup could not be made, and works once it can", async () => {
    const lookup = vi.fn<BankLookup>().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(make());
    open(
      <BankProvider host={HOST} lookup={lookup}>
        <Probe />
      </BankProvider>,
    );
    expect(await screen.findByRole("heading", { name: "We couldn't open this app" })).toBeInTheDocument();
    expect(screen.queryByText(/^app:/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/^app:Seva/)).toBeInTheDocument();
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("is not fooled by a bank that resolves after the page has moved to another address", async () => {
    let resolveFirst!: (bank: BankBranding) => void;
    const lookup = vi.fn<BankLookup>((sub) => (sub === "seva" ? new Promise((r) => (resolveFirst = r)) : Promise.resolve(make({ subdomain: "kosh", name: "Kosh Bank" }))));
    const { rerender, i18n } = open(
      <BankProvider host="seva.app.finous.site" lookup={lookup}>
        <Probe />
      </BankProvider>,
    );
    rerender(
      <I18nextProvider i18n={i18n}>
        <BankProvider host="kosh.app.finous.site" lookup={lookup}>
          <Probe />
        </BankProvider>
      </I18nextProvider>,
    );
    expect(await screen.findByText(/^app:Kosh Bank/)).toBeInTheDocument();
    await act(async () => resolveFirst(make()));
    expect(screen.queryByText(/Seva/)).not.toBeInTheDocument();
    expect(screen.getByText(/^app:Kosh Bank/)).toBeInTheDocument();
  });
});

describe("when the way of looking a bank up changes", () => {
  it("shows the latest answer, not an earlier lookup that finishes late", async () => {
    let finishOld!: (bank: BankBranding) => void;
    const old: BankLookup = () => new Promise((r) => (finishOld = r));
    const latest: BankLookup = async () => make({ name: "Latest Bank" });
    const { rerender, i18n } = open(
      <BankProvider host={HOST} lookup={old}>
        <Probe />
      </BankProvider>,
    );
    rerender(
      <I18nextProvider i18n={i18n}>
        <BankProvider host={HOST} lookup={latest}>
          <Probe />
        </BankProvider>
      </I18nextProvider>,
    );
    expect(await screen.findByText(/^app:Latest Bank/)).toBeInTheDocument();
    await act(async () => finishOld(make({ name: "Old Bank" })));
    expect(screen.queryByText(/Old Bank/)).not.toBeInTheDocument();
    expect(screen.getByText(/^app:Latest Bank/)).toBeInTheDocument();
  });
});

describe("languages", () => {
  it("leaves a bank that offers both alone, in whichever the person had", async () => {
    const { i18n } = open(
      <BankProvider host={HOST} lookup={async () => make()}>
        <Probe />
      </BankProvider>,
      "hi",
    );
    await screen.findByText(/^app:/);
    expect(i18n.resolvedLanguage).toBe("hi");
  });

  it("shows an English-only bank in English even if the person's browser asked for Hindi", async () => {
    const { i18n } = open(
      <BankProvider host={HOST} lookup={async () => make({ hindi: false })}>
        <Probe />
      </BankProvider>,
      "hi",
    );
    expect(await screen.findByText("app:Seva Co-operative Bank|en|rules")).toBeInTheDocument();
    expect(i18n.resolvedLanguage).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("shows a Hindi-only bank in Hindi even if the person's browser asked for English", async () => {
    const { i18n } = open(
      <BankProvider host={HOST} lookup={async () => make({ english: false })}>
        <Probe />
      </BankProvider>,
      "en",
    );
    expect(await screen.findByText("app:Seva Co-operative Bank|hi|rules")).toBeInTheDocument();
    await waitFor(() => expect(i18n.resolvedLanguage).toBe("hi"));
  });

  it("does not show the app in the wrong language even for a moment", async () => {
    const seen: string[] = [];
    function Spy() {
      seen.push(document.documentElement.lang);
      return <Probe />;
    }
    open(
      <BankProvider host={HOST} lookup={async () => make({ hindi: false })}>
        <Spy />
      </BankProvider>,
      "hi",
    );
    await screen.findByText(/^app:/);
    expect(seen).not.toContain("hi");
  });

  it("does not remember the forced language as the person's own choice", async () => {
    open(
      <BankProvider host={HOST} lookup={async () => make({ hindi: false })}>
        <Probe />
      </BankProvider>,
      "hi",
    );
    await screen.findByText(/^app:/);
    expect(localStorage.getItem("finous.lang")).toBeNull();
  });
});

describe("advisor setting", () => {
  it.each(["off", "rules", "ai"] as const)("passes %s through", async (advisor) => {
    open(
      <BankProvider host={HOST} lookup={async () => make({ advisor })}>
        <Probe />
      </BankProvider>,
    );
    expect(await screen.findByText(`app:Seva Co-operative Bank|en,hi|${advisor}`)).toBeInTheDocument();
  });
});
