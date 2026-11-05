import type { Locale } from '@/lib/i18n/locales';
import { translator, type Translate } from '@/lib/i18n/translate';

export const getLocale = async (): Promise<Locale> => 'pt-BR';

export const getTranslator = async (): Promise<Translate> => translator(await getLocale());
