import type { ReactNode } from 'react';
import { PageEnter } from '@/components/page-enter';

// This template is mounted again whenever the section under /write changes, which is when the page turns.
export default function WritingTemplate({ children }: { children: ReactNode }) {
  return <PageEnter>{children}</PageEnter>;
}
