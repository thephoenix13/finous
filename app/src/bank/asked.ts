/**
 * Whether a person has been asked about sharing with a bank, so the question is put once and never nags. Someone who said "Not now"
 * is remembered on this device; someone who answered either way is remembered by the database, which is what the caller checks first.
 * If the browser will not keep anything, the answer lasts until the page is closed, and the question is not asked again in that time.
 */
const later = new Set<string>();
const key = (userId: string, bankId: string) => `finous.bank.later.${userId}.${bankId}`;

export function saidNotNow(userId: string, bankId: string): boolean {
  if (later.has(key(userId, bankId))) return true;
  try {
    return window.localStorage.getItem(key(userId, bankId)) === "1";
  } catch {
    return false;
  }
}

export function rememberNotNow(userId: string, bankId: string): void {
  later.add(key(userId, bankId));
  try {
    window.localStorage.setItem(key(userId, bankId), "1");
  } catch {
    // Not kept past this visit. Asking again next time is better than failing.
  }
}

/** For tests, which start every case with nobody having said anything. */
export const forgetNotNow = () => later.clear();
