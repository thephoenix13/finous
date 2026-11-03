/** Shown for a moment while the app finds out who is signed in. */
export default function BrandSplash() {
  return (
    <div role="status" aria-busy="true" aria-label="Finous" className="flex min-h-[70vh] items-center justify-center">
      <span aria-hidden="true" className="font-display text-[40px] tracking-tight">
        Finous
      </span>
    </div>
  );
}
