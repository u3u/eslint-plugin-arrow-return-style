import tsParser from "@typescript-eslint/parser";

import type { Linter } from "eslint";
import type { RuleTesterInitOptions, TestCasesOptions } from "eslint-vitest-rule-tester";
import { run as runInternal } from "eslint-vitest-rule-tester";

export function run(options: RuleTesterInitOptions & TestCasesOptions): void {
	void runInternal({
		parser: tsParser as Linter.Parser,
		parserOptions: {
			ecmaFeatures: {
				jsx: true,
			},
			ecmaVersion: "latest",
			sourceType: "module",
		},
		...options,
	});
}
