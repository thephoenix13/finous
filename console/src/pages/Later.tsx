import { ROUTES } from "../routes";
import { ButtonLink, PageHeader } from "../ui";
import { EmptyState } from "../ui/States";

/** A screen that is part of the plan but not built yet. It says what will live here, and offers the way back. */
export default function Later({ title, description, children }: { title: string; description: string; children: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState title="Not available yet">
        <p>{children}</p>
        <div className="mt-6 flex justify-center">
          <ButtonLink to={ROUTES.overview}>Back to the overview</ButtonLink>
        </div>
      </EmptyState>
    </>
  );
}

export function NotFound() {
  return (
    <div className="mx-auto max-w-[44ch] py-16 text-center">
      <h1 className="font-display text-[26px] leading-tight">We can't find that page</h1>
      <p className="mt-3 text-ink-2">The address may be mistyped, or the page may have moved.</p>
      <div className="mt-8 flex justify-center">
        <ButtonLink to={ROUTES.overview}>Back to the overview</ButtonLink>
      </div>
    </div>
  );
}
