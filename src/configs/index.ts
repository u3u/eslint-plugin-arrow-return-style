import type { TSESLint } from "@typescript-eslint/utils";

import { plugin, PLUGIN_NAME } from "../plugin";

export const configs = {
	recommended: {
		plugins: {
			[PLUGIN_NAME]: plugin,
		},
		rules: {
			"arrow-body-style": "off",
			"arrow-return-style/arrow-return-style": "error",
			"arrow-return-style/no-export-default-arrow": "error",
		},
	},
} satisfies Record<string, TSESLint.FlatConfig.Config>;
