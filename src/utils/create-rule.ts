import { ESLintUtils } from '@typescript-eslint/utils';
import { version } from '../../package.json';

export const createRule = ESLintUtils.RuleCreator((rule) => {
  return `https://github.com/u3u/eslint-plugin-arrow-return-style/tree/v${version}/docs/rules/${rule}.md`;
});
