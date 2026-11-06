import { parseEnvironment } from '@/lib/env';
import { storageFor } from './index';

describe('storageFor', () => {
  it('stores on the local disk by default', () => {
    const storage = storageFor(
      parseEnvironment({ MONGODB_URI: 'mongodb://localhost', JWT_SECRET: 'a-test-secret-that-is-long-enough-1234' }),
    );

    expect(storage).toHaveProperty('read');
  });

  it('sends images to Cloudinary when asked', () => {
    const storage = storageFor(
      parseEnvironment({
        MONGODB_URI: 'mongodb://localhost',
        JWT_SECRET: 'a-test-secret-that-is-long-enough-1234',
        STORAGE_DRIVER: 'cloudinary',
        CLOUDINARY_URL: 'cloudinary://1234:shh@demo-cloud',
      }),
    );

    expect(storage).not.toHaveProperty('read');
    expect(storage.save).toEqual(expect.any(Function));
  });
});
