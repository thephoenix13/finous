import { describe, expect, it } from "vitest";
import { cardCycle } from "./cardCycle";

describe("cardCycle", () => {
  it("is the prototype's: statement 28 September, payment due 15 October, as of 29 September", () => {
    expect(cardCycle("2026-09-29", 28, 15)).toEqual({ statement: "2026-09-28", due: "2026-10-15" });
  });

  it("uses the statement on the day itself", () => {
    expect(cardCycle("2026-09-28", 28, 15)).toEqual({ statement: "2026-09-28", due: "2026-10-15" });
  });

  it("uses last month's statement until this month's day arrives", () => {
    expect(cardCycle("2026-09-27", 28, 15)).toEqual({ statement: "2026-08-28", due: "2026-09-15" });
  });

  it("puts the due day in the same month when it falls after the statement day", () => {
    expect(cardCycle("2026-09-12", 5, 25)).toEqual({ statement: "2026-09-05", due: "2026-09-25" });
  });

  it("falls due the next month when the due day is the statement day itself", () => {
    expect(cardCycle("2026-09-29", 28, 28)).toEqual({ statement: "2026-09-28", due: "2026-10-28" });
  });

  it("crosses a year in either direction", () => {
    expect(cardCycle("2026-12-29", 28, 15)).toEqual({ statement: "2026-12-28", due: "2027-01-15" });
    expect(cardCycle("2027-01-10", 28, 15)).toEqual({ statement: "2026-12-28", due: "2027-01-15" });
  });

  it("holds a day that a short month lacks to the month's last day", () => {
    expect(cardCycle("2027-03-05", 31, 10)).toEqual({ statement: "2027-02-28", due: "2027-03-10" });
    expect(cardCycle("2028-03-05", 31, 10)).toEqual({ statement: "2028-02-29", due: "2028-03-10" });
    expect(cardCycle("2026-05-31", 31, 10)).toEqual({ statement: "2026-05-31", due: "2026-06-10" });
  });
});
