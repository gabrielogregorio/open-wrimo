import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies the password it hashed', async () => {
    const storedHash = await hashPassword('correct horse battery');

    expect(storedHash).toMatch(/^scrypt\$16384\$8\$1\$[\w+/=]+\$[\w+/=]+$/);
    await expect(verifyPassword('correct horse battery', storedHash)).resolves.toBe(true);
  });

  it('refuses a different password', async () => {
    const storedHash = await hashPassword('correct horse battery');

    await expect(verifyPassword('correct horse batterz', storedHash)).resolves.toBe(false);
  });

  it('salts every hash', async () => {
    const [firstHash, secondHash] = await Promise.all([hashPassword('same words'), hashPassword('same words')]);

    expect(firstHash).not.toBe(secondHash);
  });

  it.each([
    ['an unknown algorithm', 'bcrypt$16384$8$1$c2FsdA==$aGFzaA=='],
    ['missing parts', 'scrypt$16384$8$1$c2FsdA=='],
    ['a key with the wrong length', 'scrypt$16384$8$1$c2FsdA==$c2hvcnQ='],
  ])('refuses a stored hash with %s', async (_description, storedHash) => {
    await expect(verifyPassword('anything', storedHash)).resolves.toBe(false);
  });

  it('rejects when the stored cost is not usable', async () => {
    const storedHash = await hashPassword('correct horse battery');
    const brokenCost = storedHash.replace('$16384$', '$3$');

    await expect(verifyPassword('correct horse battery', brokenCost)).rejects.toThrow();
  });

  it('rejects when the key derivation fails', async () => {
    const failure = new Error('out of memory');
    vi.doMock('node:crypto', async (importOriginal) => ({
      ...(await importOriginal<typeof import('node:crypto')>()),
      scrypt: (...parameters: unknown[]) => (parameters.at(-1) as (error: Error) => void)(failure),
    }));
    vi.resetModules();
    const { hashPassword: failingHash } = await import('./password');

    await expect(failingHash('anything')).rejects.toBe(failure);
    vi.doUnmock('node:crypto');
  });
});
