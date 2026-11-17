import { describe, expect, it } from "vitest";
import { formatCount, formatDate, formatPercent } from "./format";

describe("format", () => {
  it("groups digits the Indian way", () => {
    expect(formatCount(1240)).toBe("1,240");
    expect(formatCount(124000)).toBe("1,24,000");
    expect(formatCount(0)).toBe("0");
  });

  it("writes a date as day, short month and year, in UTC", () => {
    expect(formatDate("2026-11-06")).toBe("6 Nov 2026");
    expect(formatDate("2026-11-16T23:59:00Z")).toBe("16 Nov 2026");
  });

  it("rounds a percentage, and shows a dash when there is nothing to divide by", () => {
    expect(formatPercent(38)).toBe("38%");
    expect(formatPercent(37.6)).toBe("38%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(null)).toBe("–");
  });
});
