import type { ReactNode } from "react";

/** The plain frame around the sign-in screens, before anyone is signed in. */
export default function AuthLayout({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-16 md:items-center">
      <div className="w-full max-w-[420px]">
        <p className="mb-8 font-display text-[22px] leading-none">
          Finous <span className="text-[13px] font-normal text-ink-3">for institutions</span>
        </p>
        <div className="rounded-card border border-line bg-surface p-7">
          <h1 className="font-display text-[26px] leading-tight">{title}</h1>
          {description ? <p className="mt-2 text-ink-2">{description}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
