import { createHash } from 'node:crypto';
import type { OwnedImageStorage } from './storage';

export type CloudinaryCredentials = { cloudName: string; apiKey: string; apiSecret: string };

export const parseCloudinaryUrl = (url: string): CloudinaryCredentials => {
  const parsed = new URL(url);

  return {
    cloudName: parsed.hostname,
    apiKey: decodeURIComponent(parsed.username),
    apiSecret: decodeURIComponent(parsed.password),
  };
};

export const signParameters = (parameters: Record<string, string>, apiSecret: string): string => {
  const payload = Object.keys(parameters)
    .sort()
    .map((name) => `${name}=${parameters[name]}`)
    .join('&');

  // Cloudinary takes SHA-1 or SHA-256 signatures of the same string; SHA-1 is broken, so it gets SHA-256.
  return createHash('sha256').update(`${payload}${apiSecret}`).digest('hex');
};

type Options = CloudinaryCredentials & { folder: string; fetch?: typeof fetch; now?: () => Date };

export const createCloudinaryStorage = ({
  cloudName,
  apiKey,
  apiSecret,
  folder,
  fetch = globalThis.fetch,
  now = () => new Date(),
}: Options): OwnedImageStorage => {
  const endpoint = (action: string): string => `https://api.cloudinary.com/v1_1/${cloudName}/image/${action}`;

  // `file` is the image itself, or the address of one Cloudinary fetches; it is never part of the signature.
  const call = async (action: string, parameters: Record<string, string>, file?: Blob | string) => {
    const signed = { ...parameters, timestamp: String(Math.floor(now().getTime() / 1000)) };
    const body = new FormData();

    for (const [name, value] of Object.entries(signed)) {
      body.set(name, value);
    }

    body.set('api_key', apiKey);
    body.set('signature', signParameters(signed, apiSecret));

    if (file) {
      body.set('file', file);
    }

    const response = await fetch(endpoint(action), { method: 'POST', body });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: { message?: unknown } };
      const reason = typeof body.error?.message === 'string' ? `: ${body.error.message}` : '';

      throw new Error(`Cloudinary ${action} failed with status ${response.status}${reason}`);
    }

    return (await response.json()) as Record<string, unknown>;
  };

  const urlFor = (key: string): string => `https://res.cloudinary.com/${cloudName}/image/upload/${key}`;

  // The Admin API takes the key and secret as Basic auth instead of a signature.
  const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

  const deleteByPrefix = async (prefix: string, cursor?: string): Promise<string | undefined> => {
    const query = new URLSearchParams({ prefix, ...(cursor ? { next_cursor: cursor } : {}) });
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload?${query.toString()}`,
      {
        method: 'DELETE',
        headers: { authorization: `Basic ${basicAuth}` },
      },
    );

    if (!response.ok) {
      throw new Error(`Cloudinary delete by prefix failed with status ${response.status}`);
    }

    const body = (await response.json()) as { next_cursor?: unknown };

    return typeof body.next_cursor === 'string' ? body.next_cursor : undefined;
  };

  return {
    async save({ bytes, kind, folder: subfolder }) {
      const result = await call(
        'upload',
        { folder: `${folder}/${subfolder}` },
        new Blob([bytes as BlobPart], { type: kind.contentType }),
      );

      return { url: String(result.secure_url), key: String(result.public_id) };
    },

    async remove(key) {
      await call('destroy', { public_id: key, invalidate: 'true' });
    },

    // Cloudinary copies by uploading from the address of the original, into the folder of the new key,
    // the same way save() names files; the result must land exactly on the new key.
    async copy(key, toKey) {
      const slash = toKey.lastIndexOf('/');
      const result = await call(
        'upload',
        { folder: toKey.slice(0, slash), public_id: toKey.slice(slash + 1) },
        urlFor(key),
      );

      if (result.public_id !== toKey) {
        throw new Error(`Cloudinary stored the copy of ${key} as ${String(result.public_id)}, not ${toKey}`);
      }

      return { url: String(result.secure_url), key: toKey };
    },

    urlFor,

    // Deletes up to a thousand images per call, so it asks again while Cloudinary says there are more.
    async removeFolder(subfolder) {
      let cursor: string | undefined;

      do {
        cursor = await deleteByPrefix(`${folder}/${subfolder}/`, cursor);
      } while (cursor);
    },
  };
};
