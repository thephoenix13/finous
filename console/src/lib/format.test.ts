import { describe, expect, it } from "vitest";
import { formatCount, formatDate, formatDateTime, formatPercent } from "./format";

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

  it("writes a date and time in Indian time, five and a half hours ahead of UTC", () => {
    expect(formatDateTime("2026-11-17T02:00:00Z")).toBe("17 Nov 2026, 7:30 am");
    expect(formatDateTime("2026-11-16T18:45:00Z")).toBe("17 Nov 2026, 12:15 am");
    expect(formatDateTime("2026-11-17T10:15:00Z")).toBe("17 Nov 2026, 3:45 pm");
  });
});
