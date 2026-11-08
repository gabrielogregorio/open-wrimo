import { getEnvironment, parseEnvironment, resetEnvironmentCache } from './env';

const LOCAL_URI = 'mongodb://openwrimo:secret@localhost:27017/?authSource=admin';
const JWT_SECRET = 'a-test-secret-that-is-long-enough-1234';
const BASE = { MONGODB_URI: LOCAL_URI, JWT_SECRET };

describe('parseEnvironment', () => {
  it('fills the defaults when only the connection string is set', () => {
    expect(parseEnvironment(BASE)).toEqual({
      MONGODB_URI: LOCAL_URI,
      JWT_SECRET,
      MONGODB_DB: 'openwrimo',
      APP_URL: 'http://localhost:8920',
      TRUST_PROXY: false,
      STORAGE_DRIVER: 'local',
      LOCAL_UPLOADS_DIR: 'public/uploads',
      CLOUDINARY_FOLDER: 'openwrimo',
    });
  });

  it('accepts an Atlas connection string and a trusted proxy', () => {
    const environment = parseEnvironment({
      JWT_SECRET,
      MONGODB_URI: 'mongodb+srv://reader:secret@cluster0.example.mongodb.net/?retryWrites=true',
      MONGODB_DB: 'library',
      APP_URL: 'https://books.example.com',
      TRUST_PROXY: 'true',
    });

    expect(environment.TRUST_PROXY).toBe(true);
    expect(environment.MONGODB_DB).toBe('library');
  });

  it('needs a Cloudinary address only when images go to Cloudinary', () => {
    expect(() => parseEnvironment({ ...BASE, STORAGE_DRIVER: 'cloudinary' })).toThrow(/CLOUDINARY_URL/);
    expect(() =>
      parseEnvironment({
        ...BASE,
        STORAGE_DRIVER: 'cloudinary',
        CLOUDINARY_URL: 'https://leaked-secret@x',
      }),
    ).toThrow(expect.objectContaining({ message: expect.not.stringContaining('leaked-secret') }));
    expect(
      parseEnvironment({
        ...BASE,
        STORAGE_DRIVER: 'cloudinary',
        CLOUDINARY_URL: 'cloudinary://1234:secret@demo-cloud',
      }).CLOUDINARY_URL,
    ).toBe('cloudinary://1234:secret@demo-cloud');
  });

  it('needs a JWT secret of at least 32 characters', () => {
    expect(() => parseEnvironment({ MONGODB_URI: LOCAL_URI })).toThrow(/JWT_SECRET/);
    expect(() => parseEnvironment({ MONGODB_URI: LOCAL_URI, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('takes an optional cron secret of at least 32 characters', () => {
    expect(parseEnvironment({ ...BASE, CRON_SECRET: JWT_SECRET }).CRON_SECRET).toBe(JWT_SECRET);
    expect(() => parseEnvironment({ ...BASE, CRON_SECRET: 'short' })).toThrow(/CRON_SECRET/);
  });

  it('refuses a connection string from another database', () => {
    expect(() => parseEnvironment({ JWT_SECRET, MONGODB_URI: 'postgres://localhost/openwrimo' })).toThrow(
      /Invalid environment: .*MONGODB_URI/s,
    );
  });

  it('does not echo the connection string in the error', () => {
    expect(() => parseEnvironment({ MONGODB_URI: 'redis://user:leaked-password@host' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('leaked-password') }),
    );
  });
});

describe('getEnvironment', () => {
  afterEach(() => {
    resetEnvironmentCache();
    vi.unstubAllEnvs();
  });

  it('reads process.env once and keeps the result', () => {
    vi.stubEnv('MONGODB_URI', LOCAL_URI);
    vi.stubEnv('JWT_SECRET', JWT_SECRET);
    const first = getEnvironment();
    vi.stubEnv('MONGODB_URI', 'mongodb://other-host:27017');

    expect(getEnvironment()).toBe(first);
  });
});
