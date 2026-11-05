import { z } from 'zod';

const MONGODB_URI_PATTERN = /^mongodb(\+srv)?:\/\/\S+$/;

const environmentSchema = z.object({
  MONGODB_URI: z.string().regex(MONGODB_URI_PATTERN, { error: 'must start with mongodb:// or mongodb+srv://' }),
  MONGODB_DB: z.string().min(1).default('openwrimo'),
  APP_URL: z.url().default('http://localhost:8920'),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
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
