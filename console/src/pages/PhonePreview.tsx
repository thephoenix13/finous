import type { ReactNode } from "react";
import { normaliseHex } from "../lib/contrast";

/** A phone-shaped frame, so a bank sees its app the way a customer will. */
export function PhoneFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="mx-auto w-[260px] shrink-0 self-start rounded-[32px] border-[6px] border-ink bg-surface p-0 shadow-card lg:sticky lg:top-8">
      <div className="flex h-[480px] flex-col overflow-hidden rounded-[26px]">{children}</div>
    </section>
  );
}

type Look = { name: string; logo: string | null; brandColour: string; onBrandColour: string };

/** The bank's mark: its logo, or the first letter of its name when there is no logo yet. */
export function Mark({ look, size }: { look: Look; size: number }) {
  const brand = normaliseHex(look.brandColour) ?? "#1E5EFF";
  const on = normaliseHex(look.onBrandColour) ?? "#FFFFFF";
  return look.logo ? (
    <img src={look.logo} alt="" style={{ width: size, height: size }} className="rounded-[22%] object-contain" />
  ) : (
    <span aria-hidden="true" style={{ width: size, height: size, background: brand, color: on, fontSize: size * 0.5 }} className="flex items-center justify-center rounded-[22%] font-display">
      {look.name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/** The customer app's first screen under the bank's name and colours, with the disclaimer as it will read. */
export function BrandingPreview({ look, disclaimer }: { look: Look; disclaimer: string }) {
  const brand = normaliseHex(look.brandColour) ?? "#1E5EFF";
  const on = normaliseHex(look.onBrandColour) ?? "#FFFFFF";
  return (
    <PhoneFrame label="Preview of the customer app">
      <div style={{ background: brand, color: on }} className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div style={{ background: "#FFFFFF" }} className="flex size-20 items-center justify-center rounded-[22%]">
          <Mark look={look} size={64} />
        </div>
        <p className="font-display text-[22px] leading-tight">{look.name.trim() || "Your bank"}</p>
        <p className="text-[13px] opacity-90">See all your money in one place.</p>
      </div>
      <div className="space-y-3 bg-surface px-5 py-4 text-center">
        <span style={{ background: brand, color: on }} className="flex h-11 items-center justify-center rounded-btn text-[14px] font-medium">
          Get started
        </span>
        <p className="text-[11.5px] leading-snug text-ink-2">{disclaimer.trim() || "Your disclaimer appears here."}</p>
        <p className="text-[10.5px] text-ink-3">Powered by Finous</p>
      </div>
    </PhoneFrame>
  );
}

/** How the app looks on a phone's home screen: the icon and the name under it. */
export function HomeScreenPreview({ look, installName }: { look: Look; installName: string }) {
  return (
    <PhoneFrame label="Preview of the app on a phone's home screen">
      <div className="flex flex-1 flex-col bg-tint px-6 pt-10">
        <div className="grid grid-cols-4 gap-x-3 gap-y-6">
          <div className="flex flex-col items-center gap-1.5">
            <Mark look={look} size={52} />
            <span className="max-w-full truncate text-[11px] text-ink">{installName.trim() || "Your app"}</span>
          </div>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} aria-hidden="true" className="flex flex-col items-center gap-1.5">
              <span className="size-[52px] rounded-[22%] bg-line" />
              <span className="h-2 w-9 rounded bg-line" />
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}
