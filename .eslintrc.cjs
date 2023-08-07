// @ts-check

/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['@u3u', 'plugin:arrow-return-style/recommended'],
  ignorePatterns: ['dist', 'coverage'],
};
