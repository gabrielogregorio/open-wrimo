import { getEnvironment, parseEnvironment, resetEnvironmentCache } from './env';

const LOCAL_URI = 'mongodb://openwrimo:secret@localhost:27017/?authSource=admin';

describe('parseEnvironment', () => {
  it('fills the defaults when only the connection string is set', () => {
    expect(parseEnvironment({ MONGODB_URI: LOCAL_URI })).toEqual({
      MONGODB_URI: LOCAL_URI,
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
      MONGODB_URI: 'mongodb+srv://reader:secret@cluster0.example.mongodb.net/?retryWrites=true',
      MONGODB_DB: 'library',
      APP_URL: 'https://books.example.com',
      TRUST_PROXY: 'true',
    });

    expect(environment.TRUST_PROXY).toBe(true);
    expect(environment.MONGODB_DB).toBe('library');
  });

  it('needs a Cloudinary address only when images go to Cloudinary', () => {
    expect(() => parseEnvironment({ MONGODB_URI: LOCAL_URI, STORAGE_DRIVER: 'cloudinary' })).toThrow(/CLOUDINARY_URL/);
    expect(() =>
      parseEnvironment({
        MONGODB_URI: LOCAL_URI,
        STORAGE_DRIVER: 'cloudinary',
        CLOUDINARY_URL: 'https://leaked-secret@x',
      }),
    ).toThrow(expect.objectContaining({ message: expect.not.stringContaining('leaked-secret') }));
    expect(
      parseEnvironment({
        MONGODB_URI: LOCAL_URI,
        STORAGE_DRIVER: 'cloudinary',
        CLOUDINARY_URL: 'cloudinary://1234:secret@demo-cloud',
      }).CLOUDINARY_URL,
    ).toBe('cloudinary://1234:secret@demo-cloud');
  });

  it('refuses a connection string from another database', () => {
    expect(() => parseEnvironment({ MONGODB_URI: 'postgres://localhost/openwrimo' })).toThrow(
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
    const first = getEnvironment();
    vi.stubEnv('MONGODB_URI', 'mongodb://other-host:27017');

    expect(getEnvironment()).toBe(first);
  });
});
