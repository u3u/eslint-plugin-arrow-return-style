import type { Rule } from 'eslint';
import { name, version } from '../package.json';
import recommended from './configs/recommended';
import { arrowReturnStyleRule, RULE_NAME } from './rules/arrow-return-style';
import { definePlugin } from './utils';

export default definePlugin({
  configs: {
    recommended,
  },

  meta: {
    name,
    version,
  },

  rules: {
    [RULE_NAME]: arrowReturnStyleRule as unknown as Rule.RuleModule,
  },
});
