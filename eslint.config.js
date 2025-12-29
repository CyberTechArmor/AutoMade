import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true }
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: false }
      ],
      // Allow namespace for Express type extensions (standard pattern)
      '@typescript-eslint/no-namespace': 'off',
      // Allow non-null assertions where needed (e.g., req.user after auth middleware)
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Allow unsafe operations in route handlers (validated by middleware)
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      // Allow unnecessary conditionals (defensive coding)
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // Allow template literal expressions with string | undefined
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      // Allow single-use type parameters for generic functions
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      // Allow Number() for clarity even when already a number
      '@typescript-eslint/no-unnecessary-type-conversion': 'off',
      // Allow void expression returns in callbacks
      '@typescript-eslint/no-confusing-void-expression': 'off',
      // Allow async functions without await for interface consistency
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'packages/web/**',
      'drizzle.config.ts',
      'eslint.config.js',
      'vitest.config.ts',
      'tests/**',
    ],
  }
);
