// A collection is one naming tradition from one time and place. Names are data, written as they were
// used, so they are never translated; only the collection label is.
export const NAME_GROUPS = ['ancient', 'medieval', 'early-modern', 'brazil', 'asia', 'world', 'fantasy'] as const;

export type NameGroup = (typeof NAME_GROUPS)[number];

/**
 * How a full name is put together:
 * - `given-surname`: "Ana Duarte" (surnames may also be bynames such as "de Coimbra" or "o Moço").
 * - `surname-given`: "Tanaka Yui" (Japanese, Chinese, Korean order).
 * - `patronymic`: given name plus the father's name with `patronymic.son` or `patronymic.daughter`,
 *   e.g. "Ragnar Sigurdsson", "Astrid Sigurdsdóttir"; fathers come from the male list.
 * - `given-only`: a single name, as in much of antiquity; surnames, if any, are used as epithets
 *   half of the time ("Cleópatra" or "Cleópatra, a Jovem").
 */
export type NameFormat = 'given-surname' | 'surname-given' | 'patronymic' | 'given-only';

export type NameCollection = {
  id: string;
  group: NameGroup;
  /** English text, translated in the interface. */
  label: string;
  format: NameFormat;
  female: readonly string[];
  male: readonly string[];
  surnames: readonly string[];
  /** Where women carry another form of the family name (Ivanova, Ní Bhriain), used instead of `surnames`. */
  femaleSurnames?: readonly string[];
  patronymic?: { son: string; daughter: string };
};

/** Invented names built from syllables, for fantasy worlds. */
export type FantasyStyle = {
  id: string;
  /** English text, translated in the interface. */
  label: string;
  starts: readonly string[];
  femaleEnds: readonly string[];
  maleEnds: readonly string[];
  /** House, clan or epithet added after the name. */
  houses: readonly string[];
};
