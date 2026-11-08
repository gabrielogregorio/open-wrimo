// The terms in force. Changing TERMS_VERSION asks every writer to accept the new text before using
// the writing area again; TERMS_CHANGES says in a few lines what changed.
export const TERMS_VERSION = '2026-11-08T08:00:00-03:00';

export const TERMS_DATE_LABEL = '8 de novembro de 2026, às 08:00 (horário de Brasília)';

export const TERMS_CHANGES: readonly string[] = [
  'Primeira versão dos Termos de Uso e da Política de Privacidade do Open Wrimo.',
];

export const needsTermsAcceptance = (acceptedVersion: string | null | undefined): boolean =>
  acceptedVersion !== TERMS_VERSION;
