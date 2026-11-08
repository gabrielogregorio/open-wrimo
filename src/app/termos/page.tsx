import type { Metadata } from 'next';
import { TermsDocument } from '@/components/terms-document';
import { getTranslator } from '@/server/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Terms of Use and Privacy Policy'), alternates: { canonical: '/termos' } };
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <TermsDocument />
    </div>
  );
}
