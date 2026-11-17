/** Offers `text` to the person as a file to keep: a blob link, clicked once. A byte order mark makes Excel read UTF-8 (₹, Hindi) correctly. */
export function downloadText(filename: string, text: string, type = "text/csv;charset=utf-8"): void {
  const blob = new Blob(["﻿", text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before the link goes.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
