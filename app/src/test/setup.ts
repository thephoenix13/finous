import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// Tests start as a returning visitor; the welcome tests clear this to be a first-time one.
beforeEach(() => {
  if (typeof localStorage !== "undefined") localStorage.setItem("finous.firstRunDone", "1");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  // Language choice lives in localStorage and <html lang>; never let one test's leak into the next.
  if (typeof localStorage !== "undefined") localStorage.clear();
  if (typeof document !== "undefined") document.documentElement.lang = "";
  if (typeof navigator !== "undefined") {
    delete (navigator as { languages?: unknown }).languages;
    delete (navigator as { language?: unknown }).language;
  }
});
