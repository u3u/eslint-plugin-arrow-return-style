import type { GenerateOptions } from "eslint-doc-generator";
import { repository } from "./package.json";

const repoUrl = repository.url.replace(/\.git$/, "");

const config: GenerateOptions = {
	ignoreDeprecatedRules: true,
	ruleDocTitleFormat: 'desc',
	ignoreConfig: [
		"recommended",
	],
	ruleListColumns: [
		'name',
		'description',
		'fixable',
		'hasSuggestions',
		'requiresTypeChecking',
	],
	urlConfigs: repoUrl,
	pathRuleDoc: './src/rules/{name}/documentation.md',
	pathRuleList: './README.md',
};
 
export default config;