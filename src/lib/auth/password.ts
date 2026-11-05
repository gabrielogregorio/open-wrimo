import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const ALGORITHM = 'scrypt';
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 } as const;
const HASH_PARTS = 6;

const deriveKey = (password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, options, (error, key) => {
      if (error) {
        reject(error);

        return;
      }

      resolve(key);
    });
  });

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(password, salt, SCRYPT_OPTIONS);
  const { N, r, p } = SCRYPT_OPTIONS;

  return [ALGORITHM, N, r, p, salt.toString('base64'), key.toString('base64')].join('$');
};

export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  const parts = storedHash.split('$');

  if (parts.length !== HASH_PARTS || parts[0] !== ALGORITHM) {
    return false;
  }

  const [, cost, blockSize, parallelization, salt, expected] = parts;
  const expectedKey = Buffer.from(expected, 'base64');

  if (expectedKey.length !== KEY_LENGTH) {
    return false;
  }

  const key = await deriveKey(password, Buffer.from(salt, 'base64'), {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallelization),
  });

  return timingSafeEqual(key, expectedKey);
};
