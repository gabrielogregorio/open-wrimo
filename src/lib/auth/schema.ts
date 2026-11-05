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

export const USERNAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
const USERNAME_ERROR = 'Use 3 to 20 lowercase letters, numbers and dashes.';

export const usernameField = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN_LENGTH, { error: USERNAME_ERROR })
  .max(USERNAME_MAX_LENGTH, { error: USERNAME_ERROR })
  .regex(USERNAME_PATTERN, { error: USERNAME_ERROR });

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
  username: usernameField,
  email: emailField,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, { error: 'Use 10 to 128 characters.' })
    .max(PASSWORD_MAX_LENGTH, { error: 'Use 10 to 128 characters.' }),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
