import html from 'eslint-plugin-html';
import globals from 'globals';

export default [
  {
    files: ['**/*.html'],
    plugins: { html },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        FrontmatterParser: 'readonly',
        MarkdownParser: 'readonly',
        WikiLinkResolver: 'readonly',
        IndexRegenerator: 'readonly',
        BacklinkGraph: 'readonly',
        FolderScanner: 'readonly',
        SRSCardParser: 'readonly',
        SM2Scheduler: 'readonly',
        SRSCardWriter: 'readonly',
        ReviewQueueBuilder: 'readonly',
        App: 'readonly',
        STRINGS: 'readonly',
      },
    },
    rules: {
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-undef': 'error',
      'semi': ['error', 'always'],
    },
  },
  {
    ignores: ['node_modules/', 'tests/'],
  },
];
