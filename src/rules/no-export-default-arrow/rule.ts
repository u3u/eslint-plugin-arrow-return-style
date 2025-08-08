import { AST_NODE_TYPES, type TSESLint, type TSESTree } from "@typescript-eslint/utils";

import path from "node:path";

import { createEslintRule } from "../../util";

function toCamelCase(str: string): string {
	return str
		.replace(/[-_\s]+(.)?/g, (_, char: string) => (char ? char.toUpperCase() : ""))
		.replace(/^[A-Z]/, (char) => char.toLowerCase());
}

function toPascalCase(str: string): string {
	return str
		.replace(/[-_\s]+(.)?/g, (_, char: string) => (char ? char.toUpperCase() : ""))
		.replace(/^[a-z]/, (char) => char.toUpperCase());
}

export const RULE_NAME = "no-export-default-arrow";

const EXPORT_DEFAULT_ARROW_VIOLATION = "disallowExportDefaultArrow";

const messages = {
	[EXPORT_DEFAULT_ARROW_VIOLATION]: "Disallow export default anonymous arrow function",
};

function arrowReturnIsJsxElement(arrowBody: TSESTree.ArrowFunctionExpression["body"]): boolean {
	const returnValues = getArrowReturnValues(arrowBody);

	return returnValues.some((node) => isJsxElement(node));
}

function create(context: Readonly<TSESLint.RuleContext<string, []>>): TSESLint.RuleListener {
	const { sourceCode } = context;

	let program: TSESTree.Program;

	return {
		ArrowFunctionExpression: (arrowFunction) => {
			const { parent: arrowFunctionParent } = arrowFunction;

			if (arrowFunctionParent.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
				context.report({
					fix: createFixFunction({
						arrowFunction,
						arrowFunctionParent,
						context,
						program,
						sourceCode,
					}),
					messageId: "disallowExportDefaultArrow",
					node: arrowFunction,
				});
			}
		},
		Program: (node) => {
			program = node;
		},
	};
}

function createFixFunction(options: {
	arrowFunction: TSESTree.ArrowFunctionExpression;
	arrowFunctionParent: TSESTree.ExportDefaultDeclaration;
	context: TSESLint.RuleContext<string, []>;
	program: TSESTree.Program;
	sourceCode: TSESLint.SourceCode;
}) {
	const { arrowFunction, arrowFunctionParent, context, program, sourceCode } = options;

	return (fixer: TSESLint.RuleFixer) => {
		const fixes: Array<TSESLint.RuleFix> = [];
		const lastToken =
			sourceCode.getLastToken(program, { includeComments: true }) ?? arrowFunctionParent;
		const fileName = context.physicalFilename || context.filename || "namedFunction";
		const { name: fileNameWithoutExtension } = path.parse(fileName);

		const funcName = arrowReturnIsJsxElement(arrowFunction.body)
			? toPascalCase(fileNameWithoutExtension)
			: toCamelCase(fileNameWithoutExtension);

		fixes.push(
			fixer.replaceText(
				arrowFunctionParent,
				`const ${funcName} = ${sourceCode.getText(arrowFunction)}`,
			),
			fixer.insertTextAfter(lastToken, `\n\nexport default ${funcName}`),
		);

		return fixes;
	};
}

function getArrowReturnValues(
	arrowBody: TSESTree.ArrowFunctionExpression["body"],
): Array<TSESTree.Expression> {
	if (arrowBody.type === AST_NODE_TYPES.BlockStatement) {
		const blockBody = arrowBody.body;

		return blockBody
			.filter((node): node is TSESTree.ReturnStatement => {
				return node.type === AST_NODE_TYPES.ReturnStatement;
			})
			.map((node) => node.argument)
			.filter((argument): argument is TSESTree.Expression => Boolean(argument));
	}

	return [arrowBody];
}

function isJsxElement(node: TSESTree.Expression): boolean {
	return node.type === AST_NODE_TYPES.JSXElement || node.type === AST_NODE_TYPES.JSXFragment;
}

export const noExportDefaultArrowRule = createEslintRule({
	create,
	defaultOptions: [],
	meta: {
		docs: {
			description: "Disallow anonymous arrow functions as export default declarations",
			recommended: true,
			requiresTypeChecking: true,
		},
		fixable: "code",
		hasSuggestions: false,
		messages,
		schema: [],
		type: "suggestion",
	},
	name: RULE_NAME,
});
