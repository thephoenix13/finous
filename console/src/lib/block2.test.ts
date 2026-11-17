import { describe, expect, it } from "vitest";
import type { FeedField } from "../api/types";
import { csvCell, toCsv } from "./csv";
import { formatRupees } from "./format";
import { checkMapping, compactMapping } from "./mapping";
import { EMPTY_PRODUCT, formatTerm, parseProduct, type ProductForm } from "./product";

describe("csvCell and toCsv", () => {
  it("leaves plain text alone and quotes what needs it", () => {
    expect(csvCell("Rohit K.")).toBe("Rohit K.");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
    expect(csvCell("one\rreturn")).toBe('"one\rreturn"');
    expect(csvCell("both\r\nends")).toBe('"both\r\nends"');
  });

  it("stops a spreadsheet running a cell as a formula", () => {
    for (const bad of ["=SUM(A1)", "+1", "-1", "@cmd", "\tx", "\rx"]) expect(csvCell(bad).replace(/^"|"$/g, "")).toMatch(/^'/);
    expect(csvCell("=1,2")).toBe(`"'=1,2"`);
    expect(csvCell("a=b")).toBe("a=b");
  });

  it("writes a header and rows with Windows line endings and a final one", () => {
    expect(toCsv(["A", "B"], [["1", "x,y"], ["2", ""]])).toBe('A,B\r\n1,"x,y"\r\n2,\r\n');
    expect(toCsv(["A"], [])).toBe("A\r\n");
  });
});

const FIELDS: FeedField[] = [
  { key: "a", label: "Alpha", hint: "", required: true },
  { key: "b", label: "Beta", hint: "", required: true },
  { key: "c", label: "Gamma", hint: "", required: false },
];

describe("checkMapping", () => {
  it("is fine when every required field has its own column", () => {
    expect(checkMapping(FIELDS, { a: "X", b: "Y" })).toEqual({ missing: [], shared: {}, ok: true });
  });

  it("lists required fields with no column, but not optional ones", () => {
    const c = checkMapping(FIELDS, { a: "X", b: "" });
    expect(c.missing).toEqual(["Beta"]);
    expect(c.ok).toBe(false);
    expect(checkMapping(FIELDS, { a: "X", b: "Y" }).missing).not.toContain("Gamma");
  });

  it("flags one column given to two fields, optional ones included", () => {
    const c = checkMapping(FIELDS, { a: "X", b: "Y", c: "X" });
    expect(c.shared).toEqual({ X: ["Alpha", "Gamma"] });
    expect(c.ok).toBe(false);
  });

  it("drops empty choices when compacting", () => {
    expect(compactMapping({ a: "X", b: "", c: "Z" })).toEqual({ a: "X", c: "Z" });
  });
});

const GOOD: ProductForm = {
  ...EMPTY_PRODUCT,
  name: "Home loan",
  kind: "loan",
  rate: "8.75",
  tenureMin: "60",
  tenureMax: "240",
  eligibility: "Salaried, age 21 to 60.",
  fees: "0.5% of the loan.",
  disclosureEn: "Offered by the bank. Tap Learn more to talk to us.",
  disclosureHi: "बैंक की ओर से। बात करने के लिए अधिक जानें पर टैप करें।",
  live: true,
};

const parse = (patch: Partial<ProductForm>, hindiRequired = true) => parseProduct({ ...GOOD, ...patch }, { hindiRequired });
const errorsOf = (patch: Partial<ProductForm>, hindiRequired = true) => {
  const r = parse(patch, hindiRequired);
  return r.ok ? {} : r.errors;
};

describe("parseProduct", () => {
  it("turns a good form into a product, with numbers and trimmed text", () => {
    const r = parseProduct({ ...GOOD, name: "  Home loan ", rate: " 8.75 " }, { hindiRequired: true, id: "p9" });
    expect(r).toEqual({ ok: true, draft: { id: "p9", name: "Home loan", kind: "loan", rate: 8.75, tenureMin: 60, tenureMax: 240, eligibility: "Salaried, age 21 to 60.", fees: "0.5% of the loan.", disclosureEn: GOOD.disclosureEn, disclosureHi: GOOD.disclosureHi, live: true } });
  });

  it("leaves the id off a new product", () => {
    const r = parse({});
    expect(r.ok && "id" in r.draft).toBe(false);
  });

  it("checks the name at its edges", () => {
    expect(errorsOf({ name: "A" }).name).toBeDefined();
    expect(errorsOf({ name: "AB" }).name).toBeUndefined();
    expect(errorsOf({ name: "x".repeat(60) }).name).toBeUndefined();
    expect(errorsOf({ name: "x".repeat(61) }).name).toBeDefined();
  });

  it("needs a kind", () => {
    expect(errorsOf({ kind: "" }).kind).toMatch(/loan or deposit/);
  });

  it("accepts only a sensible rate", () => {
    for (const bad of ["", "abc", "0", "-1", "36.01", "8,75", "8.", ".5"]) expect(errorsOf({ rate: bad }).rate, bad).toBeDefined();
    for (const ok of ["0.1", "8.75", "36", "13"]) expect(errorsOf({ rate: ok }).rate, ok).toBeUndefined();
  });

  it("accepts only whole months for the terms, up to 600", () => {
    for (const bad of ["", "0", "1.5", "abc", "-3", "601"]) {
      expect(errorsOf({ tenureMin: bad }).tenureMin, bad).toBeDefined();
      expect(errorsOf({ tenureMax: bad, tenureMin: "1" }).tenureMax, bad).toBeDefined();
    }
    expect(errorsOf({ tenureMin: "600", tenureMax: "600" })).toEqual({});
    expect(errorsOf({ tenureMin: "1", tenureMax: "1" })).toEqual({});
  });

  it("refuses a longest term shorter than the shortest, but allows equal", () => {
    expect(errorsOf({ tenureMin: "60", tenureMax: "59" }).tenureMax).toMatch(/can't be shorter/);
    expect(errorsOf({ tenureMin: "60", tenureMax: "60" }).tenureMax).toBeUndefined();
  });

  it("asks for eligibility, fees and an English disclosure of enough length", () => {
    expect(errorsOf({ eligibility: "short" }).eligibility).toBeDefined();
    expect(errorsOf({ eligibility: "x".repeat(10) }).eligibility).toBeUndefined();
    expect(errorsOf({ fees: "no" }).fees).toBeDefined();
    expect(errorsOf({ fees: "Nil" }).fees).toBeUndefined();
    expect(errorsOf({ disclosureEn: "x".repeat(19) }).disclosureEn).toBeDefined();
    expect(errorsOf({ disclosureEn: "x".repeat(20) }).disclosureEn).toBeUndefined();
  });

  it("will not let the disclosure say Apply", () => {
    for (const bad of ["Apply now at your branch today.", "You can apply online for this loan.", "Start applying for this loan now."]) {
      expect(errorsOf({ disclosureEn: bad }).disclosureEn, bad).toMatch(/Learn more, not Apply/);
    }
    expect(errorsOf({ disclosureEn: "Offered by the bank. Ask us about an application." }).disclosureEn).toBeUndefined();
  });

  it("needs the Hindi disclosure only when the bank has Hindi on", () => {
    expect(errorsOf({ disclosureHi: "" }, true).disclosureHi).toMatch(/Hindi/);
    expect(errorsOf({ disclosureHi: "" }, false).disclosureHi).toBeUndefined();
    expect(parse({ disclosureHi: "" }, false).ok).toBe(true);
  });

  it("reports every problem at once", () => {
    const r = parse({ name: "", kind: "", rate: "", tenureMin: "", tenureMax: "", eligibility: "", fees: "", disclosureEn: "", disclosureHi: "" });
    expect(r.ok).toBe(false);
    expect(Object.keys(r.ok ? {} : r.errors).sort()).toEqual(["disclosureEn", "disclosureHi", "eligibility", "fees", "kind", "name", "rate", "tenureMax", "tenureMin"]);
  });
});

describe("formatTerm and formatRupees", () => {
  it("says a term the way people do", () => {
    expect(formatTerm(6)).toBe("6 months");
    expect(formatTerm(1)).toBe("1 month");
    expect(formatTerm(12)).toBe("1 year");
    expect(formatTerm(60)).toBe("5 years");
    expect(formatTerm(18)).toBe("1 year 6 months");
    expect(formatTerm(25)).toBe("2 years 1 month");
  });

  it("writes rupees with Indian grouping, rounded", () => {
    expect(formatRupees(2850000)).toBe("₹28,50,000");
    expect(formatRupees(32400)).toBe("₹32,400");
    expect(formatRupees(999.6)).toBe("₹1,000");
  });
});
