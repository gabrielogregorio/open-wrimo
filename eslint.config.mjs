import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import sonarjs from 'eslint-plugin-sonarjs';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  sonarjs.configs.recommended,
  {
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      'react/button-has-type': 'error',
      curly: ['error', 'all'],
      'no-plusplus': 'error',
      'padding-line-between-statements': ['error', { blankLine: 'always', prev: '*', next: 'return' }],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='clear'][callee.object.name=/^(localStorage|sessionStorage)$/]",
          message: 'Never clear the whole storage: the origin may be shared with other projects.',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'sonarjs/no-nested-conditional': 'error',
      // Images are already resized and turned into WebP on upload (src/lib/storage/images.ts) and served
      // straight from Cloudinary or /media. next/image would only add Vercel's paid optimization per image.
      '@next/next/no-img-element': 'off',
    },
  },
  {
    files: ['e2e/**'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'e2e/**', 'src/test/**'],
    rules: {
      'sonarjs/no-hardcoded-passwords': 'off',
      'sonarjs/no-hardcoded-ip': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    '.next-dev/**',
    'out/**',
    'build/**',
    'coverage/**',
    'trash/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
  ]),
]);
