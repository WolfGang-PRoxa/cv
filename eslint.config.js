import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'dist/', '.dist/', 'out/', 'release/'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    // Interface Electron et moteur de CV, utilisé aussi dans l'interface.
    files: ['src/renderer/**/*.js', 'src/shared/**/*.js'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // Script intégré tel quel à chaque CV exporté.
    files: ['src/shared/cv/template/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser } },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
  },
];
