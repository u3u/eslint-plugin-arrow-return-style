import '@total-typescript/ts-reset';
import type { Rule } from 'eslint';
import { name, version } from '../package.json';
import recommended from './configs/recommended';
import { arrowReturnStyleRule, RULE_NAME as arrowReturnStyleRuleName } from './rules/arrow-return-style';
import { noExportDefaultArrowRule, RULE_NAME as noExportDefaultArrowRuleName } from './rules/no-export-default-arrow';
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
    [arrowReturnStyleRuleName]: arrowReturnStyleRule as unknown as Rule.RuleModule,
    [noExportDefaultArrowRuleName]: noExportDefaultArrowRule as unknown as Rule.RuleModule,
  },
});
