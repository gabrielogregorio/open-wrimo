import type { Environment } from '@/lib/env';
import { createCloudinaryStorage, parseCloudinaryUrl } from './cloudinary';
import { createLocalStorage } from './local';
import type { ImageStorage } from './storage';

export const storageFor = (environment: Environment): ImageStorage =>
  environment.STORAGE_DRIVER === 'cloudinary'
    ? createCloudinaryStorage({
        ...parseCloudinaryUrl(environment.CLOUDINARY_URL!),
        folder: environment.CLOUDINARY_FOLDER,
      })
    : createLocalStorage(environment.LOCAL_UPLOADS_DIR);
