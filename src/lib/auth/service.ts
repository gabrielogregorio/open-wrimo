import { deletionState, type AccessLog } from '@/lib/account/account';
import { fieldErrorsFrom, type FieldErrors } from '@/lib/form';
import { TERMS_VERSION } from '@/lib/legal/terms';
import { hashPassword, verifyPassword } from './password';
import { LOGIN_RULES, REGISTER_RULES, minutesUntil, type RateLimiter, type RateRule } from './rate-limit';
import { signInSchema, signUpSchema } from './schema';
import type { SessionRepository } from './session';
import type { UserRepository } from './users';

export const INVALID_CREDENTIALS = 'Invalid email or password.';
export const TOO_MANY_ATTEMPTS = 'Too many attempts. Try again in {minutes} minutes.';
export const EMAIL_TAKEN = 'This email is already registered.';
export const USERNAME_TAKEN = 'This username is taken.';
export const ACCOUNT_CLOSED = 'This account was deleted at its owner’s request.';

export type AuthDependencies = {
  users: UserRepository;
  sessions: SessionRepository;
  limiter: RateLimiter;
  accessLog: AccessLog;
  now: () => Date;
};

export type AuthResult =
  | { ok: true; refreshToken: string; userId: string; username: string }
  | { ok: false; error?: string; retryAfterMinutes?: number; fieldErrors?: FieldErrors };

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
  userAgent = '',
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

  // Within the grace period the writer may sign in to cancel the deletion; after it, never again.
  if (deletionState(user.deletionRequestedAt, now) === 'closed') {
    return { ok: false, error: ACCOUNT_CLOSED };
  }

  await dependencies.limiter.reset(emailKey);
  await dependencies.accessLog.record(
    { userId: user._id.toHexString(), action: 'login', address: clientAddress, userAgent },
    now,
  );

  return {
    ok: true,
    refreshToken: await dependencies.sessions.create(user._id, now),
    userId: user._id.toHexString(),
    username: user.username,
  };
};

export const signUp = async (
  dependencies: AuthDependencies,
  input: Record<string, unknown>,
  clientAddress: string | null,
  userAgent = '',
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
    termsVersion: TERMS_VERSION,
    termsAcceptedAt: now,
  });

  if (!userId) {
    return { ok: false, fieldErrors: { email: EMAIL_TAKEN } };
  }

  await dependencies.accessLog.record(
    { userId: userId.toHexString(), action: 'register', address: clientAddress, userAgent },
    now,
  );

  return {
    ok: true,
    refreshToken: await dependencies.sessions.create(userId, now),
    userId: userId.toHexString(),
    username,
  };
};
