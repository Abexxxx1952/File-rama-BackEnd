/* // eslint.config.mjs */
/* import antfu from '@antfu/eslint-config' */
/* export default antfu() */
import { FlatCompat } from '@eslint/eslintrc';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import path from 'path';

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  {
    files: ['**/*.js', '**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: path.resolve(__dirname, 'tsconfig.json'),
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    extends: [
      'plugin:@typescript-eslint/recommended',
      'plugin:prettier/recommended',
    ],
    rules: {
      rules: {
        '@typescript-eslint/interface-name-prefix': 'off',
        '@typescript-eslint/explicit-function-return-type': 'on',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'on',
        'prettier/prettier': [
          'error',
          {
            endOfLine: 'crlf',
            printWidth: 80,
            tabWidth: 2,
            semi: true,
            singleQuote: true,
            trailingComma: 'all',
            bracketSpacing: true,
            arrowParens: 'always',
            noMultipleEmptyLines: true,
          },
        ],
        'no-multiple-empty-lines': ['error', { max: 0, maxEOF: 0, maxBOF: 0 }],
        'array-bracket-newline': ['error', 'consistent'],
        'padding-line-between-statements': [
          'error',
          { blankLine: 'always', prev: '*', next: 'return' },
          { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
          {
            blankLine: 'any',
            prev: ['const', 'let', 'var'],
            next: ['const', 'let', 'var'],
          },
          { blankLine: 'always', prev: 'directive', next: '*' },
          { blankLine: 'any', prev: 'directive', next: 'directive' },
          { blankLine: 'always', prev: '*', next: 'expression' },
        ],
        'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],

        'padded-blocks': [
          'warn',
          { blocks: 'never', classes: 'always', switches: 'never' },
        ],
        'import/no-cycle': 'off',
        'no-prototype-builtins': 'error',
      },
    },
  },

  {
    ignores: ['.eslintrc.js'],
  },
];
