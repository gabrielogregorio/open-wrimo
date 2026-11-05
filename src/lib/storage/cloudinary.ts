import { createHash } from 'node:crypto';
import type { ImageStorage } from './storage';

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

  // eslint-disable-next-line sonarjs/hashing -- Cloudinary request signatures are SHA-1
  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
};

type Options = CloudinaryCredentials & { folder: string; fetch?: typeof fetch; now?: () => Date };

export const createCloudinaryStorage = ({
  cloudName,
  apiKey,
  apiSecret,
  folder,
  fetch = globalThis.fetch,
  now = () => new Date(),
}: Options): ImageStorage => {
  const endpoint = (action: string): string => `https://api.cloudinary.com/v1_1/${cloudName}/image/${action}`;

  const call = async (action: string, parameters: Record<string, string>, file?: Blob) => {
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
      throw new Error(`Cloudinary ${action} failed with status ${response.status}`);
    }

    return (await response.json()) as Record<string, unknown>;
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
  };
};
