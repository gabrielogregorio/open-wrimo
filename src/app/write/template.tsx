import type { ReactNode } from 'react';
import { PageEnter } from '@/components/page-enter';

// Mounted again whenever the section under /write changes, so the new section can slide in.
export default function WritingTemplate({ children }: { children: ReactNode }) {
  return <PageEnter>{children}</PageEnter>;
}
