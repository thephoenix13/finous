// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetNotNow, rememberNotNow, saidNotNow } from "./asked";

beforeEach(() => {
  forgetNotNow();
  window.localStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe("'Not now' about sharing with a bank", () => {
  it("is not said until someone says it", () => {
    expect(saidNotNow("u1", "b1")).toBe(false);
  });

  it("is remembered for that person and that bank only", () => {
    rememberNotNow("u1", "b1");
    expect(saidNotNow("u1", "b1")).toBe(true);
    expect(saidNotNow("u2", "b1")).toBe(false);
    expect(saidNotNow("u1", "b2")).toBe(false);
  });

  it("only believes what it stored itself: another value under the key is not a yes", () => {
    window.localStorage.setItem("finous.bank.later.u1.b1", "0");
    expect(saidNotNow("u1", "b1")).toBe(false);
  });

  it("is kept on the device, so it survives the page being reopened", () => {
    rememberNotNow("u1", "b1");
    forgetNotNow();
    expect(saidNotNow("u1", "b1")).toBe(true);
  });

  it("lasts until the page is closed when the browser will not keep anything, and never throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(saidNotNow("u1", "b1")).toBe(false);
    expect(() => rememberNotNow("u1", "b1")).not.toThrow();
    expect(saidNotNow("u1", "b1")).toBe(true);
  });
});
