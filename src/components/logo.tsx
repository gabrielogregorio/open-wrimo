export function LogoMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <path d="M4 7c4-1.5 8-1.2 12 1v18c-4-2.2-8-2.5-12-1z" fill="currentColor" opacity="0.85" />
      <path d="M28 7c-4-1.5-8-1.2-12 1v18c4-2.2 8-2.5 12-1z" fill="currentColor" opacity="0.55" />
      <path d="M21 8.5v8l2-1.5 2 1.5v-8.8" fill="var(--ribbon)" />
    </svg>
  );
}
