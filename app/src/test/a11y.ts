import axe from "axe-core";
import { expect } from "vitest";

/**
 * Fails the test if axe finds a WCAG violation in `container`.
 * Colour contrast is skipped because jsdom has no layout or computed colours; the tokens are
 * checked by hand (ink-3 is 4.8:1 on the page background).
 */
export async function expectAccessible(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}
