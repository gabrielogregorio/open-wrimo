'use client';

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-sm border border-rule px-4 py-2 font-display text-sm print:hidden">
      {label}
    </button>
  );
}
