import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    env: { JWT_SECRET: 'unit-test-secret-that-is-at-least-32-chars' },
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: { name: 'node', environment: 'node', include: ['src/lib/**/*.test.ts'], hookTimeout: 120_000 },
      },
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          include: ['src/server/**/*.test.ts', 'src/app/**/*.test.ts', 'src/proxy.test.ts'],
          setupFiles: ['src/test/setup-server.ts'],
          hookTimeout: 120_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/components/**/*.test.tsx'],
          setupFiles: ['src/test/setup-dom.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/**/*.ts',
        'src/components/**/*.tsx',
        'src/server/**/*.ts',
        'src/proxy.ts',
        'src/app/actions/**/*.ts',
        'src/app/api/**/route.ts',
        'src/app/media/**/route.ts',
      ],
      exclude: ['**/*.test.ts', '**/*.test.tsx'],
      reporter: ['text', 'html'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
});
