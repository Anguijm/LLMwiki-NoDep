import html from 'eslint-plugin-html';
import globals from 'globals';

const restrictedSinks = [
  {
    selector:
      "AssignmentExpression[left.type='MemberExpression'][left.computed=false][left.property.name='innerHTML']",
    message:
      'Assigning to .innerHTML is banned (escape-by-default discipline; see CLAUDE.md non-negotiables). Use textContent or DOM construction instead.',
  },
  {
    selector:
      "AssignmentExpression[left.type='MemberExpression'][left.computed=true][left.property.value='innerHTML']",
    message:
      'Assigning to .innerHTML via computed access is banned (escape-by-default discipline). Use textContent or DOM construction instead.',
  },
  {
    selector:
      "AssignmentExpression[left.type='MemberExpression'][left.computed=false][left.property.name='outerHTML']",
    message:
      'Assigning to .outerHTML is banned (escape-by-default discipline; see CLAUDE.md non-negotiables). Use DOM construction instead.',
  },
  {
    selector:
      "AssignmentExpression[left.type='MemberExpression'][left.computed=true][left.property.value='outerHTML']",
    message:
      'Assigning to .outerHTML via computed access is banned (escape-by-default discipline). Use DOM construction instead.',
  },
  {
    selector:
      "CallExpression[callee.type='MemberExpression'][callee.computed=false][callee.property.name='insertAdjacentHTML']",
    message:
      'insertAdjacentHTML is banned (escape-by-default discipline; see CLAUDE.md non-negotiables). Use DOM construction instead.',
  },
  {
    selector:
      "CallExpression[callee.type='MemberExpression'][callee.computed=true][callee.property.value='insertAdjacentHTML']",
    message:
      'insertAdjacentHTML via computed access is banned (escape-by-default discipline). Use DOM construction instead.',
  },
];

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
        Slugger: 'readonly',
        SectionDelimiterParser: 'readonly',
        App: 'readonly',
        STRINGS: 'readonly',
      },
    },
    rules: {
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-undef': 'error',
      'no-restricted-syntax': ['error', ...restrictedSinks],
      'semi': ['error', 'always'],
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        // Globals injected by tests/setup.js
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
        Slugger: 'readonly',
        SectionDelimiterParser: 'readonly',
        App: 'readonly',
        STRINGS: 'readonly',
      },
    },
    rules: {
      'eqeqeq': ['error', 'always'],
      'no-eval': 'off', // setup.js uses indirect eval intentionally
      'no-restricted-syntax': ['error', ...restrictedSinks],
      'semi': ['error', 'always'],
    },
  },
  {
    ignores: ['node_modules/', 'tests/eslint-fixtures/'],
  },
];
