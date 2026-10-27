import { describe, expect, it } from "vitest";
import { formatMonthYear, percent } from "./format";

describe("percent", () => {
  it.each([
    [8.9, "8.9%"],
    [8.5, "8.5%"],
    [9, "9%"],
    [8.25, "8.25%"],
    [8.256, "8.26%"],
    [0.5, "0.5%"],
    [0, "0%"],
    [14, "14%"],
  ])("writes %s as %s", (value, shown) => {
    expect(percent(value)).toBe(shown);
  });

  it("can allow more or fewer decimals", () => {
    expect(percent(8.256, 1)).toBe("8.3%");
    expect(percent(8.256, 0)).toBe("8%");
    expect(percent(8.256, 3)).toBe("8.256%");
  });

  it("does not leave a stray minus on a rate that rounds to zero", () => {
    expect(percent(-0.001)).toBe("0%");
  });
});

describe("formatMonthYear", () => {
  it("writes English from a fixed table: three letters, September is Sep", () => {
    const names = Array.from({ length: 12 }, (_, i) => formatMonthYear({ year: 2043, month: i + 1 }));
    expect(names).toEqual(["Jan 2043", "Feb 2043", "Mar 2043", "Apr 2043", "May 2043", "Jun 2043", "Jul 2043", "Aug 2043", "Sep 2043", "Oct 2043", "Nov 2043", "Dec 2043"]);
  });

  it.each(["en", "en-IN", "en-GB", "EN-us"])("keeps the English table for %s, whatever the runtime's locale data says", (locale) => {
    // Intl spells September "Sept" in en-IN and en-GB.
    expect(formatMonthYear({ year: 2026, month: 9 }, locale)).toBe("Sep 2026");
  });

  it("writes Hindi months in Devanagari with Western digits for the year", () => {
    expect(formatMonthYear({ year: 2043, month: 11 }, "hi")).toBe("नव॰ 2043");
    expect(formatMonthYear({ year: 2044, month: 3 }, "hi")).toBe("मार्च 2044");
    expect(formatMonthYear({ year: 2026, month: 9 }, "hi")).toBe("सित॰ 2026");
  });

  it("gives every month a Hindi name", () => {
    for (let month = 1; month <= 12; month++) expect(formatMonthYear({ year: 2043, month }, "hi")).toMatch(/^[ऀ-ॿ॰]+ 2043$/);
  });

  it("does not shift a month across a time zone", () => {
    // Built from UTC, so the first of January is never read as December on a machine behind UTC.
    expect(formatMonthYear({ year: 2027, month: 1 }, "hi")).toBe("जन॰ 2027");
  });

  it("uses English when no locale is given", () => {
    expect(formatMonthYear({ year: 2044, month: 3 })).toBe("Mar 2044");
    expect(formatMonthYear({ year: 2044, month: 3 }, undefined)).toBe("Mar 2044");
    expect(formatMonthYear({ year: 2044, month: 3 }, "")).toBe("Mar 2044");
  });
});
