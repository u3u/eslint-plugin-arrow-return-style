import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,

  dts: {
    compilerOptions: {
      moduleResolution: 'node',
    },

    resolve: true,
  },

  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  shims: true,
});
