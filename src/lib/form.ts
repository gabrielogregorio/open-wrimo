import type { z } from 'zod';

export type FieldErrors = Partial<Record<string, string>>;

export type FormState = {
  error?: string;
  errorValues?: Record<string, number>;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
  saved?: boolean;
};

export const formValues = (formData: FormData, fields: readonly string[]): Record<string, string> =>
  Object.fromEntries(
    fields.map((field) => {
      const value = formData.get(field);

      return [field, typeof value === 'string' ? value : ''];
    }),
  );

export const fieldErrorsFrom = (error: z.ZodError): FieldErrors => {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'form');
    fieldErrors[field] ??= issue.message;
  }

  return fieldErrors;
};
