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
    rules: {
      // Les noms de fichiers sont nettoyés de leurs caractères de contrôle, volontairement.
      'no-control-regex': 'off',
      // Une déstructuration sert à retirer des champs (jeton, clé) avant d'envoyer le reste.
      'no-unused-vars': ['error', { ignoreRestSiblings: true }],
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
