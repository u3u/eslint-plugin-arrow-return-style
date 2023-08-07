import type { ESLint } from 'eslint';

export const definePlugin = <T extends ESLint.Plugin>(plugin: T) => {
  return plugin;
};
