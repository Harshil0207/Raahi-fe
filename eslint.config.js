import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', 'node_modules'] },
  {
    /**
     * Build-time and maintenance code, which runs in Node rather than a
     * browser.
     *
     * Without this the Vite config, the SEO plugin and the brand-asset script
     * were linted as browser code: `process` read as undefined, and `.mjs` was
     * not covered by any block at all, so the script was not linted whatsoever.
     */
    files: ['vite.config.js', 'eslint.config.js', 'plugins/**/*.{js,mjs}', 'scripts/**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      parserOptions: { sourceType: 'module' }
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' }
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Fetching in an effect sets its state after an await, so it cannot cause
      // the cascading render this rule guards against. The cases that genuinely
      // could — resetting state when a prop changed — are derived during render
      // instead, so the rule has nothing left to catch here.
      'react-hooks/set-state-in-effect': 'off',
      // JSX-only identifiers read as unused to the base rule.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }]
    }
  }
];
