import { accountBlock, createAccountRepository } from '@/lib/account/account';
import { clientAddressFrom } from '@/lib/auth/request';
import type { AuthResult } from '@/lib/auth/service';
import { verifyAccessToken, type AccessClaims } from '@/lib/auth/tokens';
import { getEnvironment } from '@/lib/env';
import { getDatabase } from '@/lib/db/client';
import type { FormState } from '@/lib/form';
import { tokenPair } from './tokens';

export const dynamic = 'force-dynamic';

export const json = (body: unknown, status = 200): Response =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export const unauthorized = (): Response => json({ error: 'A valid access token is required.' }, 401);

export const bearerClaims = async (request: Request): Promise<AccessClaims | null> => {
  const header = request.headers.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');

  return scheme === 'Bearer' ? verifyAccessToken(token, getEnvironment().JWT_SECRET) : null;
};

export const TERMS_OUTDATED = 'Accept the new Terms of Use on the site to keep using the API.';

/** The writer behind a bearer token, or the response to send: 401 without a live account, 403 until the new terms are accepted. */
export const bearerWriter = async (request: Request): Promise<AccessClaims | Response> => {
  const claims = await bearerClaims(request);

  if (!claims) {
    return unauthorized();
  }

  const block = accountBlock(await createAccountRepository(await getDatabase()).status(claims.userId));

  if (block === 'terms') {
    return json({ error: TERMS_OUTDATED }, 403);
  }

  return block ? unauthorized() : claims;
};

export const requestAddress = (request: Request): string | null =>
  clientAddressFrom(request.headers.get('x-forwarded-for'), getEnvironment().TRUST_PROXY);

const MAX_USER_AGENT_LENGTH = 300;

export const requestUserAgent = (request: Request): string =>
  (request.headers.get('user-agent') ?? '').slice(0, MAX_USER_AGENT_LENGTH);

export const readJson = async (request: Request): Promise<Record<string, unknown>> => {
  try {
    const body: unknown = await request.json();

    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

export const authResponse = async (result: AuthResult, successStatus = 200): Promise<Response> => {
  if (!result.ok) {
    return json(
      { error: result.error, retryAfterMinutes: result.retryAfterMinutes, fieldErrors: result.fieldErrors },
      result.retryAfterMinutes ? 429 : 400,
    );
  }

  return json(await tokenPair(result, result.refreshToken), successStatus);
};

export const formResponse = (result: FormState & { id?: string }, successStatus = 200): Response => {
  if (result.error || result.fieldErrors) {
    const status = result.error && !result.fieldErrors ? 404 : 400;

    return json({ error: result.error, fieldErrors: result.fieldErrors }, status);
  }

  return json({ id: result.id, saved: true }, successStatus);
};

export const stringFields = (form: FormData): Record<string, string> =>
  Object.fromEntries([...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === 'string'));

export const fileBytes = async (form: FormData, field: string): Promise<Uint8Array | null> => {
  const file = form.get(field);

  return file instanceof File && file.size > 0 ? new Uint8Array(await file.arrayBuffer()) : null;
};
