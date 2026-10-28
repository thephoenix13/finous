/**
 * Writes HINDI_REVIEW.csv: every screen string in English beside its Hindi, for a native speaker to check. Open it in Excel or
 * Google Sheets, fix the "Corrected Hindi" column and note why in "Comment"; rows left blank are accepted as they are.
 *
 * Usage: npm run hindi-review   (Node 22.6 or newer reads the TypeScript catalogs directly.)
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const { en } = await import("../src/i18n/locales/en.ts");
const { hi } = await import("../src/i18n/locales/hi.ts");

const flatten = (object, prefix = "") =>
  Object.entries(object).flatMap(([key, value]) => (typeof value === "string" ? [[`${prefix}${key}`, value]] : flatten(value, `${prefix}${key}.`)));

const hindi = new Map(flatten(hi));
const quote = (text) => `"${String(text).replaceAll('"', '""')}"`;
const rows = [["Screen", "Key", "English", "Hindi (current)", "Corrected Hindi", "Comment"]];
for (const [key, english] of flatten(en)) {
  rows.push([key.split(".")[0], key, english, hindi.get(key) ?? "", "", ""]);
}

// A byte-order mark lets Excel open the Devanagari as UTF-8.
writeFileSync(join(here, "..", "HINDI_REVIEW.csv"), "﻿" + rows.map((row) => row.map(quote).join(",")).join("\r\n") + "\r\n", "utf8");
console.log(`Wrote HINDI_REVIEW.csv: ${rows.length - 1} strings.`);
