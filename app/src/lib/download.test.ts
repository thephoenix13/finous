// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadJson } from "./download";

const readBlob = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });

describe("downloadJson", () => {
  let created: Blob[];
  let revoked: string[];
  let clicked: { href: string; download: string }[];

  beforeEach(() => {
    vi.useFakeTimers();
    created = [];
    revoked = [];
    clicked = [];
    URL.createObjectURL = (blob: Blob | MediaSource) => {
      created.push(blob as Blob);
      return `blob:test/${created.length}`;
    };
    URL.revokeObjectURL = (url: string) => void revoked.push(url);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.href, download: this.download });
      expect(document.body.contains(this)).toBe(true);
    });
  });
  afterEach(() => vi.useRealTimers());

  it("offers the data as a named JSON file, readable as written", async () => {
    downloadJson("mine.json", { a: 1, nested: { b: ["x"] } });
    expect(clicked).toEqual([{ href: "blob:test/1", download: "mine.json" }]);
    expect(created[0].type).toBe("application/json");
    vi.useRealTimers();
    expect(JSON.parse(await readBlob(created[0]))).toEqual({ a: 1, nested: { b: ["x"] } });
  });

  it("writes it indented so a person can read it", async () => {
    downloadJson("x.json", { a: 1 });
    vi.useRealTimers();
    expect(await readBlob(created[0])).toBe('{\n  "a": 1\n}');
  });

  it("leaves nothing on the page, and lets the file go a moment later", () => {
    downloadJson("x.json", {});
    expect(document.querySelector("a[download]")).toBeNull();
    expect(revoked).toEqual([]);
    vi.advanceTimersByTime(1000);
    expect(revoked).toEqual(["blob:test/1"]);
  });
});
