import "@total-typescript/ts-reset";

import type { Linter } from "eslint";

import { configs } from "./configs";
import { plugin } from "./plugin";

// Default export for ESLint v9+ (flat config)
export default {
	...plugin,
	configs,
};

// Named exports for ESLint v8 (legacy config)
export const { rules } = plugin;

export type RuleOptions = {
	[K in keyof RuleDefinitions]: RuleDefinitions[K]["defaultOptions"];
};

export type Rules = {
	[K in keyof RuleOptions]: Linter.RuleEntry<RuleOptions[K]>;
};

type RuleDefinitions = typeof plugin.rules;

export { configs } from "./configs";
