import { describe, expect, it } from "vitest";
import { returnTo } from "./SignIn";

describe("returnTo", () => {
  it("goes back to a screen inside the console, with its query", () => {
    expect(returnTo({ from: "/help" })).toBe("/help");
    expect(returnTo({ from: "/settings/team/invite" })).toBe("/settings/team/invite");
    expect(returnTo({ from: "/help?topic=problem" })).toBe("/help?topic=problem");
  });

  it("goes to the overview when there is nowhere to go back to", () => {
    for (const state of [null, undefined, {}, { from: undefined }, { from: 42 }, { from: "" }, "/help"]) expect(returnTo(state)).toBe("/");
  });

  it("never leaves the site: a web address, a protocol-relative address or a backslash trick all go to the overview", () => {
    for (const from of ["https://evil.example", "http://evil.example/x", "//evil.example", "///evil.example", "/\\evil.example", "evil.example", "javascript:alert(1)"]) {
      expect(returnTo({ from })).toBe("/");
    }
  });

  it("does not send them back to a sign-in screen", () => {
    expect(returnTo({ from: "/sign-in" })).toBe("/");
    expect(returnTo({ from: "/sign-in/verify" })).toBe("/");
  });
});
