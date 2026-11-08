import { z } from 'zod';

const MONGODB_URI_PATTERN = /^mongodb(\+srv)?:\/\/\S+$/;

const CLOUDINARY_URL_PATTERN = /^cloudinary:\/\/[^:\s]+:[^@\s]+@[\w-]+$/;

const environmentSchema = z
  .object({
    MONGODB_URI: z.string().regex(MONGODB_URI_PATTERN, { error: 'must start with mongodb:// or mongodb+srv://' }),
    MONGODB_DB: z.string().min(1).default('openwrimo'),
    APP_URL: z.url().default('http://localhost:8920'),
    TRUST_PROXY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    JWT_SECRET: z.string().min(32, { error: 'must have at least 32 characters' }),
    STORAGE_DRIVER: z.enum(['local', 'cloudinary']).default('local'),
    LOCAL_UPLOADS_DIR: z.string().min(1).default('public/uploads'),
    CLOUDINARY_URL: z
      .string()
      .regex(CLOUDINARY_URL_PATTERN, { error: 'must look like cloudinary://<key>:<secret>@<cloud>' })
      .optional(),
    CLOUDINARY_FOLDER: z
      .string()
      .regex(/^[\w/-]+$/)
      .default('openwrimo'),
    /** Secret the scheduler sends to the account purge route; without it the route stays closed. */
    CRON_SECRET: z.string().min(32, { error: 'must have at least 32 characters' }).optional(),
  })
  .refine((environment) => environment.STORAGE_DRIVER === 'local' || environment.CLOUDINARY_URL, {
    path: ['CLOUDINARY_URL'],
    error: 'is required when STORAGE_DRIVER is cloudinary',
  });

export type Environment = z.infer<typeof environmentSchema>;

export const parseEnvironment = (source: Record<string, string | undefined>): Environment => {
  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(result.error)}`);
  }

  return result.data;
};

let cachedEnvironment: Environment | undefined;

export const getEnvironment = (): Environment => {
  cachedEnvironment ??= parseEnvironment(process.env);

  return cachedEnvironment;
};

export const resetEnvironmentCache = (): void => {
  cachedEnvironment = undefined;
};
