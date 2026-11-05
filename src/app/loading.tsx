import { BookLoader } from '@/components/book-loader';
import { getTranslator } from '@/server/i18n';

export default async function Loading() {
  const t = await getTranslator();

  return <BookLoader label={t('Turning the pages…')} />;
}
