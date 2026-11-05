import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 80;
const EMAIL_MAX_LENGTH = 254;

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_LENGTH, { error: 'Enter a valid email address.' })
  .pipe(z.email({ error: 'Enter a valid email address.' }));

export const signInSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(1, { error: 'Enter your password.' })
    .max(PASSWORD_MAX_LENGTH, { error: 'Enter your password.' }),
});

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'Enter a name up to 80 characters.' })
    .max(NAME_MAX_LENGTH, { error: 'Enter a name up to 80 characters.' }),
  email: emailField,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, { error: 'Use 10 to 128 characters.' })
    .max(PASSWORD_MAX_LENGTH, { error: 'Use 10 to 128 characters.' }),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
