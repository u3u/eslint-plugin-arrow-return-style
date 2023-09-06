import dedent from 'dedent';
import { defineConfig } from 'tsup';

export default defineConfig({
  banner: ({ format }) => {
    if (format !== 'esm') return;

    return {
      js: dedent`
        import { createRequire } from 'node:module';
        const require = createRequire(import.meta.url);\n
      `,
    };
  },

  clean: true,

  dts: {
    compilerOptions: {
      module: 'esnext',
      moduleResolution: 'node',
    },

    resolve: true,
  },

  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  shims: true,
});
