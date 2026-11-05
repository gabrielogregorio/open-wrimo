import { sanitizeRichText } from '@/lib/writing/rich-text';

export function RichText({ html, className = '' }: { html: string; className?: string }) {
  if (!/^\s*</.test(html)) {
    return <p className={`whitespace-pre-line ${className}`}>{html}</p>;
  }

  return <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }} />;
}
