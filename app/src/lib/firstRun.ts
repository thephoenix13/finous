const KEY = "finous.firstRunDone";

/**
 * Whether this browser has been through the welcome steps. Stored on the device only. If storage is unavailable (a private
 * window, blocked site data) there is no way to remember, so it counts as done: the welcome must never trap someone.
 */
export function firstRunDone(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function markFirstRunDone(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // Nothing to remember it with; see firstRunDone.
  }
}
