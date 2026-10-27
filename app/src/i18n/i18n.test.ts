// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createI18n, detectLanguage, isLanguage, setLanguage, STORAGE_KEY } from "./index";

function browserLanguages(languages: string[]) {
  Object.defineProperty(navigator, "languages", { value: languages, configurable: true });
  Object.defineProperty(navigator, "language", { value: languages[0] ?? "", configurable: true });
}

describe("isLanguage", () => {
  it("accepts only languages the app ships", () => {
    expect(isLanguage("en")).toBe(true);
    expect(isLanguage("hi")).toBe(true);
    expect(isLanguage("fr")).toBe(false);
    expect(isLanguage("hi-IN")).toBe(false);
    expect(isLanguage(null)).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
  });
});

describe("detectLanguage", () => {
  it("uses the browser's preferred language", () => {
    browserLanguages(["hi-IN", "en"]);
    expect(detectLanguage()).toBe("hi");
  });

  it("respects the order of the browser's preferences", () => {
    browserLanguages(["en-IN", "hi-IN"]);
    expect(detectLanguage()).toBe("en");
  });

  it("skips languages the app does not have and takes the next supported one", () => {
    browserLanguages(["fr-FR", "hi"]);
    expect(detectLanguage()).toBe("hi");
  });

  it("falls back to English when nothing matches", () => {
    browserLanguages(["fr-FR", "de"]);
    expect(detectLanguage()).toBe("en");
  });

  it("falls back to English when the browser reports no languages", () => {
    browserLanguages([]);
    expect(detectLanguage()).toBe("en");
  });

  it("prefers the saved choice over the browser", () => {
    browserLanguages(["en-US"]);
    localStorage.setItem(STORAGE_KEY, "hi");
    expect(detectLanguage()).toBe("hi");
  });

  it("ignores a saved value it does not recognise", () => {
    browserLanguages(["hi-IN"]);
    localStorage.setItem(STORAGE_KEY, "klingon");
    expect(detectLanguage()).toBe("hi");
  });

  it("still works when storage is blocked", () => {
    browserLanguages(["hi-IN"]);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(detectLanguage()).toBe("hi");
  });
});

describe("createI18n", () => {
  it("translates in the requested language", () => {
    expect(createI18n("en").t("nav.home")).toBe("Home");
    expect(createI18n("hi").t("nav.home")).toBe("होम");
  });

  it("is ready immediately, with no loading state", () => {
    expect(createI18n("hi").isInitialized).toBe(true);
  });

  it("sets <html lang> to the language", () => {
    createI18n("hi");
    expect(document.documentElement.lang).toBe("hi");
  });

  it("falls back to English for a key missing in the chosen language", () => {
    const i18n = createI18n("hi");
    i18n.removeResourceBundle("hi", "translation");
    i18n.addResourceBundle("hi", "translation", {});
    expect(i18n.t("nav.home")).toBe("Home");
  });

  it("gives each instance its own language state", () => {
    const a = createI18n("en");
    const b = createI18n("hi");
    expect(a.t("nav.you")).toBe("You");
    expect(b.t("nav.you")).toBe("आप");
  });
});

describe("setLanguage", () => {
  it("switches the language, the <html lang>, and remembers the choice", async () => {
    const i18n = createI18n("en");
    await setLanguage(i18n, "hi");
    expect(i18n.t("nav.home")).toBe("होम");
    expect(document.documentElement.lang).toBe("hi");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("hi");
  });

  it("is picked up by the next visit", async () => {
    browserLanguages(["en-US"]);
    await setLanguage(createI18n("en"), "hi");
    expect(detectLanguage()).toBe("hi");
  });

  it("still switches for this session when storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const i18n = createI18n("en");
    await expect(setLanguage(i18n, "hi")).resolves.toBeUndefined();
    expect(i18n.t("nav.home")).toBe("होम");
  });

  it("can switch back", async () => {
    const i18n = createI18n("hi");
    await setLanguage(i18n, "en");
    expect(i18n.t("nav.home")).toBe("Home");
    expect(document.documentElement.lang).toBe("en");
  });
});
