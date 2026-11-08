'use client';

import { useI18n } from '../i18n-provider';

export function ComingSoon() {
  const { t } = useI18n();

  return <p className="sheet rounded-sm p-8 text-center text-ink-soft">{t('This tool is on its way.')}</p>;
}
