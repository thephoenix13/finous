import { describe, expect, it } from "vitest";
import { formatDayMonth, formatList, formatMonthYear, percent, toLakhs } from "./format";

describe("formatList", () => {
  it("joins two with 'and'", () => {
    expect(formatList(["Emergency fund", "Diversification"])).toBe("Emergency fund and Diversification");
  });

  it("joins three the way English does, with a comma before 'and'", () => {
    expect(formatList(["a", "b", "c"], "en")).toBe("a, b, and c");
  });

  it("leaves one item alone and an empty list empty", () => {
    expect(formatList(["Diversification"])).toBe("Diversification");
    expect(formatList([])).toBe("");
  });

  it("uses Hindi's own word for 'and'", () => {
    expect(formatList(["आपातकालीन निधि", "विविधीकरण"], "hi")).toBe("आपातकालीन निधि और विविधीकरण");
    expect(formatList(["क", "ख", "ग"], "hi")).toBe("क, ख, और ग"); // CLDR puts a comma before "और" from three items up
  });

  it("is English when no locale is given", () => {
    expect(formatList(["a", "b"])).toBe(formatList(["a", "b"], "en"));
  });
});

describe("formatDayMonth", () => {
  it("writes English from a fixed table, with the full month and no year", () => {
    expect(formatDayMonth("2027-03-31")).toBe("31 March");
    expect(formatDayMonth("2026-09-05")).toBe("5 September");
    expect(formatDayMonth("2026-01-01")).toBe("1 January");
    expect(formatDayMonth("2026-12-25", "en-IN")).toBe("25 December");
  });

  it("names every English month in full", () => {
    const names = Array.from({ length: 12 }, (_, i) => formatDayMonth(`2027-${String(i + 1).padStart(2, "0")}-15`).split(" ")[1]);
    expect(names).toEqual(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);
  });

  it("writes Hindi with Devanagari month names and Western digits for the day", () => {
    expect(formatDayMonth("2027-03-31", "hi")).toBe("31 मार्च");
    expect(formatDayMonth("2026-09-05", "hi")).toBe("5 सितंबर");
  });

  it("does not move the day across a time zone", () => {
    expect(formatDayMonth("2027-01-01", "hi")).toBe("1 जनवरी");
    expect(formatDayMonth("2027-12-31", "hi")).toBe("31 दिसंबर");
  });

  it("uses English when no locale is given", () => {
    expect(formatDayMonth("2027-03-31", undefined)).toBe("31 March");
    expect(formatDayMonth("2027-03-31", "")).toBe("31 March");
  });
});

describe("toLakhs", () => {
  it.each([
    [4_000_000, "40"],
    [876_399, "8.8"],
    [6_200_000, "62"],
    [150_000, "1.5"],
    [10_000, "0.1"],
    [0, "0"],
    [4_049_999, "40.5"],
  ])("writes %i as %s", (amount, shown) => {
    expect(toLakhs(amount)).toBe(shown);
  });

  it("can keep more decimals", () => {
    expect(toLakhs(876_399, 2)).toBe("8.76");
    expect(toLakhs(876_399, 0)).toBe("9");
  });
});

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
