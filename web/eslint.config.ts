import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'entities', pattern: 'src/entities/*' },
        { type: 'use-cases', pattern: 'src/use-cases/*' },
        { type: 'adapters', pattern: 'src/adapters/*' },
        { type: 'controller', pattern: 'src/controller/*' },
        { type: 'ui', pattern: 'src/ui/**/*' },
        { type: 'app', pattern: 'src/App.tsx' },
        { type: 'main', pattern: 'src/main.tsx' },
      ],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Clean Architecture enforcement
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          rules: [
            // L1 entities: no imports from other layers
            {
              from: 'entities',
              disallow: ['use-cases', 'adapters', 'controller', 'ui', 'app', 'main'],
              message: 'L1 entities must not import from higher layers',
            },
            // L2 use cases: only import entities
            {
              from: 'use-cases',
              disallow: ['adapters', 'controller', 'ui', 'app', 'main'],
              message: 'L2 use cases must not import from L3/L4',
            },
            // L3 adapters: only import entities and use cases
            {
              from: 'adapters',
              disallow: ['controller', 'ui', 'app', 'main'],
              message: 'L3 adapters must not import from L4',
            },
            // L3 controller: only import entities and use cases
            {
              from: 'controller',
              disallow: ['adapters', 'ui', 'app', 'main'],
              message: 'Controller must not import from adapters or UI (except via ports)',
            },
          ],
        },
      ],
    },
  },
);
