import isentinel, { GLOB_MARKDOWN_CODE, GLOB_TS } from "@isentinel/eslint-config";

import eslintPlugin from "eslint-plugin-eslint-plugin";

export default isentinel(
	{
		pnpm: true,
		roblox: false,
		rules: {
			"max-lines": "off",
		},
		test: false,
		type: "package",
	},
	{
		ignores: ["fixtures"],
	},
	{
		files: [GLOB_TS],
		...eslintPlugin.configs["all-type-checked"],
		rules: {
			...eslintPlugin.configs["all-type-checked"].rules,
			"eslint-plugin/meta-property-ordering": "off",
			"eslint-plugin/require-meta-docs-description": [
				"error",
				{
					pattern: "^(Enforce|Require|Disallow).*[^\.!]$",
				},
			],
			"eslint-plugin/require-meta-docs-url": "off",
		},
	},
	{
		files: [GLOB_MARKDOWN_CODE],
		rules: {
			"arrow-style/arrow-return-style": "off",
			"arrow-style/no-export-default-arrow": "off",
		},
	},
);
