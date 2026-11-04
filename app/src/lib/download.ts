/** Offers `data` to the person as a JSON file to keep. Works in the installed app and the browser: a blob link, clicked once. */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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
