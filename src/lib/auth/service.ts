import { fieldErrorsFrom, type FieldErrors } from '@/lib/form';
import { hashPassword, verifyPassword } from './password';
import { LOGIN_RULES, REGISTER_RULES, minutesUntil, type RateLimiter, type RateRule } from './rate-limit';
import { signInSchema, signUpSchema } from './schema';
import type { SessionRepository } from './session';
import type { UserRepository } from './users';

export const INVALID_CREDENTIALS = 'Invalid email or password.';
export const TOO_MANY_ATTEMPTS = 'Too many attempts. Try again in {minutes} minutes.';
export const EMAIL_TAKEN = 'This email is already registered.';
export const USERNAME_TAKEN = 'This username is taken.';

export type AuthDependencies = {
  users: UserRepository;
  sessions: SessionRepository;
  limiter: RateLimiter;
  now: () => Date;
};

export type AuthResult =
  { ok: true; token: string } | { ok: false; error?: string; retryAfterMinutes?: number; fieldErrors?: FieldErrors };

type Limit = { key: string; rule: RateRule };

const DUMMY_HASH_PASSWORD = 'openwrimo-dummy-password';
let dummyHash: Promise<string> | undefined;

const checkLimits = async (limiter: RateLimiter, limits: Limit[], now: Date): Promise<AuthResult | null> => {
  const decisions = await Promise.all(limits.map(({ key, rule }) => limiter.consume(key, rule, now)));
  const blocked = decisions.filter((decision) => !decision.allowed);

  if (blocked.length === 0) {
    return null;
  }

  const retryAfterMs = Math.max(...blocked.map((decision) => decision.retryAfterMs));

  return { ok: false, error: TOO_MANY_ATTEMPTS, retryAfterMinutes: minutesUntil(retryAfterMs) };
};

const addressLimit = (scope: string, clientAddress: string | null, rule: RateRule): Limit[] =>
  clientAddress ? [{ key: `${scope}:address:${clientAddress}`, rule }] : [];

export const signIn = async (
  dependencies: AuthDependencies,
  input: Record<string, unknown>,
  clientAddress: string | null,
): Promise<AuthResult> => {
  const parsed = signInSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { email, password } = parsed.data;
  const now = dependencies.now();
  const emailKey = `login:email:${email}`;
  const limited = await checkLimits(
    dependencies.limiter,
    [
      { key: emailKey, rule: LOGIN_RULES.perEmail },
      ...addressLimit('login', clientAddress, LOGIN_RULES.perAddress),
      { key: 'login:global', rule: LOGIN_RULES.global },
    ],
    now,
  );

  if (limited) {
    return limited;
  }

  const user = await dependencies.users.findByEmail(email);

  if (!user) {
    dummyHash ??= hashPassword(DUMMY_HASH_PASSWORD);
    await verifyPassword(password, await dummyHash);

    return { ok: false, error: INVALID_CREDENTIALS };
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, error: INVALID_CREDENTIALS };
  }

  await dependencies.limiter.reset(emailKey);

  return { ok: true, token: await dependencies.sessions.create(user._id, now) };
};

export const signUp = async (
  dependencies: AuthDependencies,
  input: Record<string, unknown>,
  clientAddress: string | null,
): Promise<AuthResult> => {
  const parsed = signUpSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const now = dependencies.now();
  const limited = await checkLimits(
    dependencies.limiter,
    [
      ...addressLimit('register', clientAddress, REGISTER_RULES.perAddress),
      { key: 'register:global', rule: REGISTER_RULES.global },
    ],
    now,
  );

  if (limited) {
    return limited;
  }

  const { name, username, email, password } = parsed.data;

  if (await dependencies.users.findByUsername(username)) {
    return { ok: false, fieldErrors: { username: USERNAME_TAKEN } };
  }

  const userId = await dependencies.users.insert({
    name,
    username,
    email,
    passwordHash: await hashPassword(password),
    createdAt: now,
  });

  if (!userId) {
    return { ok: false, fieldErrors: { email: EMAIL_TAKEN } };
  }

  return { ok: true, token: await dependencies.sessions.create(userId, now) };
};
