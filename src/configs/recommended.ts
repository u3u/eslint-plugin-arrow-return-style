import { defineConfig } from '../utils';

export default defineConfig({
  plugins: ['arrow-return-style'],

  rules: {
    'arrow-return-style/arrow-return-style': 'warn',
  },
});
