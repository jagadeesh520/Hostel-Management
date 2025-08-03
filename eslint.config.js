// eslint.config.js
const { defineConfig } = require('eslint');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig, // Spread to avoid nested arrays
  {
    ignores: ['dist/*', 'node_modules/*'],
  },
]);
