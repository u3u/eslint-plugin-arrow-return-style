import type { GenerateOptions } from "eslint-doc-generator";

import packageJson from "./package.json" with { type: "json" };

const repoUrl = packageJson.repository.url.replace(/\.git$/, "");

const config: GenerateOptions = {
	ignoreConfig: ["recommended"],
	ignoreDeprecatedRules: true,
	pathRuleDoc: "./src/rules/{name}/documentation.md",
	pathRuleList: "./README.md",
	ruleDocTitleFormat: "desc",
	ruleListColumns: ["name", "description", "fixable", "hasSuggestions", "requiresTypeChecking"],
	urlConfigs: repoUrl,
};

export default config;
