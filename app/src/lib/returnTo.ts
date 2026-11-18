/**
 * Where to go once someone has signed in: the screen a link pointed at. It travels in the router's state, which any page that
 * got there by a link could have set to anything, so it is only believed if it is a screen of this app: a path on this
 * address, never another site, and never one of the screens people are being taken away from.
 */
const NOT_BACK_TO = ["/signin", "/join", "/welcome", "/demo"];
const LONGEST = 500;
// A backslash or a control character has no place in a path here, and some browsers read a backslash as a slash.
const UNSAFE = /[\u0000-\u001f\u007f\\]/;

/** The path to send someone to after signing in, from whatever the router state says. Anything doubtful goes Home. */
export function returnPath(from: unknown): string {
  if (typeof from !== "string" || from.length === 0 || from.length > LONGEST) return "/";
  // "//evil.example" is an address on another site, not a path on this one.
  if (!from.startsWith("/") || from.startsWith("//") || UNSAFE.test(from)) return "/";
  const path = from.split(/[?#]/)[0];
  if (NOT_BACK_TO.some((p) => path === p || path.startsWith(`${p}/`))) return "/";
  return from;
}

/** What to remember about where a link was going, to pass as router state. Home is the default, so it is not worth remembering. */
export function rememberReturn(location: { pathname: string; search: string }): { from: string } | undefined {
  const from = `${location.pathname}${location.search}`;
  return returnPath(from) === "/" ? undefined : { from };
}

/** The remembered destination out of a router location's state. */
export function returnFrom(state: unknown): string {
  return returnPath(typeof state === "object" && state !== null ? (state as { from?: unknown }).from : undefined);
}
