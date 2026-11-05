import { cookies, headers } from 'next/headers';
import { LOCALE_COOKIE, LOCALE_HEADER, normalizeLocale, resolveLocale, type Locale } from '@/lib/i18n/locales';
import { translator, type Translate } from '@/lib/i18n/translate';

export const getLocale = async (): Promise<Locale> => {
  const headerList = await headers();
  const fromProxy = normalizeLocale(headerList.get(LOCALE_HEADER));

  if (fromProxy) {
    return fromProxy;
  }

  return resolveLocale({
    query: null,
    saved: (await cookies()).get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerList.get('accept-language'),
  });
};

export const getTranslator = async (): Promise<Translate> => translator(await getLocale());
