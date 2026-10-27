import { describe, expect, it } from "vitest";
import { addMonths } from "./finance";
import { formatClock, formatDayMonth, formatList, formatMonthYear, formatWeekdayDate, formatWhen, ordinalDay, parseMonth, percent, roundSig, signedInr, toLakhs } from "./format";

describe("parseMonth", () => {
  it("reads a month string into a year and a month", () => {
    expect(parseMonth("2027-12")).toEqual({ year: 2027, month: 12 });
    expect(parseMonth("2026-09")).toEqual({ year: 2026, month: 9 });
    expect(parseMonth("2038-06")).toEqual({ year: 2038, month: 6 });
  });

  it("feeds addMonths and formatMonthYear: 24 months after Dec 2027 is Dec 2029", () => {
    expect(formatMonthYear(addMonths(parseMonth("2027-12"), 24))).toBe("Dec 2029");
    expect(formatMonthYear(addMonths(parseMonth("2027-12"), 1))).toBe("Jan 2028");
  });
});

describe("roundSig", () => {
  it.each([
    [134_827, 135_000],
    [50_000, 50_000],
    [18_364.39, 18_400],
    [46_097.91, 46_100],
    [1_293_667, 1_290_000],
    [999, 999],
    [1_234, 1_230],
    [0.0123456, 0.0123],
    [7, 7],
  ])("rounds %s to three significant figures: %s", (value, expected) => {
    expect(roundSig(value)).toBeCloseTo(expected, 10);
  });

  it("is the same rule at every size: three figures of a small number, and of a large one", () => {
    expect(roundSig(18_364)).toBe(18_400);
    expect(roundSig(183_640)).toBe(184_000);
    expect(roundSig(1_836_400)).toBe(1_840_000);
  });

  it("can keep more or fewer figures", () => {
    expect(roundSig(134_827, 2)).toBe(130_000);
    expect(roundSig(134_827, 5)).toBe(134_830);
    expect(roundSig(134_827, 1)).toBe(100_000);
  });

  it("rounds a negative the same way, and leaves zero and non-numbers alone", () => {
    expect(roundSig(-134_827)).toBe(-135_000);
    expect(roundSig(0)).toBe(0);
    expect(roundSig(Number.NaN)).toBeNaN();
    expect(roundSig(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
  });
});

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

describe("formatWeekdayDate", () => {
  it("writes English from fixed tables: the weekday, the day and the full month", () => {
    expect(formatWeekdayDate("2026-09-29")).toBe("Tuesday, 29 September");
    expect(formatWeekdayDate("2027-01-01")).toBe("Friday, 1 January");
    expect(formatWeekdayDate("2026-12-27", "en-IN")).toBe("Sunday, 27 December");
  });

  it("writes Hindi in Devanagari, without moving the day across a time zone", () => {
    expect(formatWeekdayDate("2026-09-29", "hi")).toBe("मंगलवार, 29 सितंबर");
    expect(formatWeekdayDate("2027-01-01", "hi")).toBe("शुक्रवार, 1 जनवरी");
  });

  it("uses English when no locale is given", () => {
    expect(formatWeekdayDate("2026-09-29", undefined)).toBe("Tuesday, 29 September");
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

describe("formatWhen", () => {
  const labels = { today: "Today", yesterday: "Yesterday" };

  it("says Today and Yesterday", () => {
    expect(formatWhen("2026-09-29", "2026-09-29", labels)).toBe("Today");
    expect(formatWhen("2026-09-28", "2026-09-29", labels)).toBe("Yesterday");
  });

  it("names the weekday for the days before that, up to six days back", () => {
    expect(formatWhen("2026-09-27", "2026-09-29", labels)).toBe("Sun");
    expect(formatWhen("2026-09-26", "2026-09-29", labels)).toBe("Sat");
    expect(formatWhen("2026-09-23", "2026-09-29", labels)).toBe("Wed");
  });

  it("writes the day and month from a week back, and for a day that has not happened yet", () => {
    expect(formatWhen("2026-09-22", "2026-09-29", labels)).toBe("22 September");
    expect(formatWhen("2026-09-19", "2026-09-29", labels)).toBe("19 September");
    expect(formatWhen("2026-09-30", "2026-09-29", labels)).toBe("30 September");
  });

  it("counts across a month and a year end", () => {
    expect(formatWhen("2026-12-31", "2027-01-01", labels)).toBe("Yesterday");
    expect(formatWhen("2026-12-30", "2027-01-01", labels)).toBe("Wed");
  });

  it("writes the Hindi weekday and month in Devanagari", () => {
    expect(formatWhen("2026-09-27", "2026-09-29", { today: "आज", yesterday: "कल" }, "hi")).toMatch(/रवि/);
    expect(formatWhen("2026-09-19", "2026-09-29", { today: "आज", yesterday: "कल" }, "hi")).toBe("19 सितंबर");
  });
});

describe("formatClock", () => {
  it.each([
    ["21:12", "9:12 PM"],
    ["07:00", "7:00 AM"],
    ["00:05", "12:05 AM"],
    ["12:00", "12:00 PM"],
    ["12:30", "12:30 PM"],
    ["23:59", "11:59 PM"],
  ])("writes %s as %s", (time, shown) => {
    expect(formatClock(time)).toBe(shown);
  });

  it("writes Hindi through Intl, with the same hour", () => {
    expect(formatClock("21:12", "hi")).toMatch(/9:12/);
  });
});

describe("ordinalDay", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [15, "15th"],
    [21, "21st"],
    [22, "22nd"],
    [23, "23rd"],
    [28, "28th"],
    [31, "31st"],
  ])("writes %i as %s in English", (day, shown) => {
    expect(ordinalDay(day)).toBe(shown);
  });

  it("leaves the number bare in Hindi, whose sentence words the day around it", () => {
    expect(ordinalDay(28, "hi")).toBe("28");
  });
});

describe("signedInr", () => {
  it("writes money in with a plus and money out with a true minus", () => {
    expect(signedInr(240_000)).toBe("+₹2,40,000");
    expect(signedInr(-842)).toBe("−₹842");
    expect(signedInr(0)).toBe("₹0");
  });
});
