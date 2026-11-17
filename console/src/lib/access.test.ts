import { describe, expect, it } from "vitest";
import { AREA_LABEL, canOpen, ROLES, rolesThatCanOpen, type Area } from "./access";

const AREAS = Object.keys(AREA_LABEL) as Area[];

describe("access", () => {
  it("lets every role open the overview, reports and help", () => {
    for (const role of ROLES) for (const area of ["overview", "reports", "help"] as const) expect(canOpen(role, area)).toBe(true);
  });

  it("lets an Admin open everything", () => {
    for (const area of AREAS) expect(canOpen("admin", area)).toBe(true);
  });

  it("keeps setup and money to the Admin", () => {
    for (const role of ROLES.filter((r) => r !== "admin")) for (const area of ["app", "integration", "team", "billing"] as const) expect(canOpen(role, area)).toBe(false);
  });

  it("gives Compliance the compliance records and products, but not campaigns or opportunities", () => {
    expect(canOpen("compliance", "compliance")).toBe(true);
    expect(canOpen("compliance", "products")).toBe(true);
    expect(canOpen("compliance", "campaigns")).toBe(false);
    expect(canOpen("compliance", "opportunities")).toBe(false);
  });

  it("gives Marketing campaigns and opportunities, and Branch opportunities only", () => {
    expect(canOpen("marketing", "campaigns")).toBe(true);
    expect(canOpen("marketing", "opportunities")).toBe(true);
    expect(canOpen("branch", "opportunities")).toBe(true);
    expect(canOpen("branch", "campaigns")).toBe(false);
    expect(canOpen("branch", "products")).toBe(false);
  });

  it("keeps Read-only to the overview, reports and help", () => {
    expect(AREAS.filter((a) => canOpen("readonly", a)).sort()).toEqual(["help", "overview", "reports"]);
  });

  it("lists the roles that can open an area, for the no-access screen", () => {
    expect(rolesThatCanOpen("billing")).toEqual(["admin"]);
    expect(rolesThatCanOpen("compliance")).toEqual(["admin", "compliance"]);
  });
});
