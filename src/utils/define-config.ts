import type { Linter } from 'eslint';

export const defineConfig = <T extends Linter.Config>(config: T) => {
  return config;
};
