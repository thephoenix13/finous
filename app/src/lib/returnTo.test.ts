import { describe, expect, it } from "vitest";
import { rememberReturn, returnFrom, returnPath } from "./returnTo";

describe("returnPath", () => {
  it("believes a screen of this app, with its query and anything after", () => {
    expect(returnPath("/accounts")).toBe("/accounts");
    expect(returnPath("/you/bank")).toBe("/you/bank");
    expect(returnPath("/plans/goals/home-upgrade?tab=2")).toBe("/plans/goals/home-upgrade?tab=2");
    expect(returnPath("/search?q=rent#top")).toBe("/search?q=rent#top");
  });

  it("goes Home for anything that is not a string, or is empty", () => {
    for (const bad of [undefined, null, 42, {}, [], "", true]) expect(returnPath(bad)).toBe("/");
  });

  it("never leaves the app: another site, in any spelling, goes Home", () => {
    const away = [
      "https://evil.example",
      "http://evil.example/x",
      "//evil.example",
      "//evil.example/accounts",
      "evil.example",
      "javascript:alert(1)",
      "/\\evil.example",
      "\\\\evil.example",
      "/ok\\..\\evil",
    ];
    for (const address of away) expect(returnPath(address), address).toBe("/");
  });

  it("refuses control characters, which could split a header or hide an address", () => {
    expect(returnPath("/accounts\n//evil.example")).toBe("/");
    expect(returnPath("/accounts\r")).toBe("/");
    expect(returnPath("/a\u0000b")).toBe("/");
    expect(returnPath("/a\u007fb")).toBe("/");
  });

  it("does not send people back to the screens they are being taken away from", () => {
    for (const away of ["/signin", "/signin?x=1", "/join", "/welcome", "/welcome/consent", "/welcome/sync", "/demo"]) {
      expect(returnPath(away), away).toBe("/");
    }
  });

  it("matches those screens exactly, not by a shared start: /signing-bonus is an ordinary path", () => {
    expect(returnPath("/signing-bonus")).toBe("/signing-bonus");
    expect(returnPath("/joint")).toBe("/joint");
    expect(returnPath("/welcomes")).toBe("/welcomes");
  });

  it("goes Home for a path that is too long to be a real screen", () => {
    expect(returnPath(`/${"a".repeat(499)}`)).toBe(`/${"a".repeat(499)}`);
    expect(returnPath(`/${"a".repeat(500)}`)).toBe("/");
  });
});

describe("rememberReturn", () => {
  it("remembers a screen and its query", () => {
    expect(rememberReturn({ pathname: "/accounts", search: "?sort=name" })).toEqual({ from: "/accounts?sort=name" });
  });

  it("does not bother remembering Home, or a screen it would not go back to", () => {
    expect(rememberReturn({ pathname: "/", search: "" })).toBeUndefined();
    expect(rememberReturn({ pathname: "/signin", search: "" })).toBeUndefined();
    expect(rememberReturn({ pathname: "/join", search: "" })).toBeUndefined();
  });
});

describe("returnFrom", () => {
  it("reads the remembered path out of router state", () => {
    expect(returnFrom({ from: "/accounts" })).toBe("/accounts");
  });

  it("goes Home when there is no state, or it is not what was put there", () => {
    expect(returnFrom(undefined)).toBe("/");
    expect(returnFrom(null)).toBe("/");
    expect(returnFrom("/accounts")).toBe("/");
    expect(returnFrom({ from: "//evil.example" })).toBe("/");
    expect(returnFrom({})).toBe("/");
  });
});
