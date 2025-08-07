import type { TSESLint } from "@typescript-eslint/utils";

import type { Linter } from "eslint";

import { name as packageName, version as packageVersion } from "../package.json";
import { arrowReturnStyleRule } from "./rules/arrow-return-style/rule";
import { noExportDefaultArrowRule } from "./rules/no-export-default-arrow/rule";

export const PLUGIN_NAME = packageName.replace(/^eslint-plugin-/, "");

/**
 * Generates a rules record where all plugin rules are set to "error".
 *
 * @param pluginName - The plugin identifier used to prefix rule names.
 * @param rules - The rules record to transform.
 * @returns A Linter.RulesRecord with all rules enabled.
 */
export function getRules(
	pluginName: string,
	rules: Record<string, TSESLint.RuleModule<any, any>>,
): Linter.RulesRecord {
	return Object.fromEntries(
		Object.keys(rules).map((ruleName) => [`${pluginName}/${ruleName}`, "error"]),
	);
}

export const plugin = {
	meta: {
		name: PLUGIN_NAME,
		version: packageVersion,
	},
	rules: {
		"arrow-return-style": arrowReturnStyleRule,
		"no-export-default-arrow": noExportDefaultArrowRule,
	},
} satisfies TSESLint.FlatConfig.Plugin;

export const allRules = getRules(PLUGIN_NAME, plugin.rules);
