import {
	AST_NODE_TYPES,
	AST_TOKEN_TYPES,
	ASTUtils,
	type TSESLint,
	type TSESTree,
} from "@typescript-eslint/utils";

import assert from "node:assert";

import { createEslintRule } from "../../util";

type Options = [
	{
		jsxAlwaysUseExplicitReturn?: boolean;
		maxLen?: number;
		namedExportsAlwaysUseExplicitReturn?: boolean;
	},
];

export const RULE_NAME = "arrow-return-style";

const IMPLICIT_RETURN_VIOLATION = "use-implicit-return";
const EXPLICIT_RETURN_VIOLATION = "use-explicit-return";

type MessageIds = typeof EXPLICIT_RETURN_VIOLATION | typeof IMPLICIT_RETURN_VIOLATION;

const messages = {
	[EXPLICIT_RETURN_VIOLATION]: "Use implicit return for single-line arrow function bodies.",
	[IMPLICIT_RETURN_VIOLATION]: "Use explicit return for multiline arrow function bodies.",
};

interface ImplicitReturnFixOptions {
	closingBrace: TSESTree.Token;
	openingBrace: TSESTree.Token;
	returnStatement: TSESTree.ReturnStatement;
	returnValue: TSESTree.Expression;
	sourceCode: TSESLint.SourceCode;
}

function commentsExistBetweenTokens(
	node: TSESTree.ArrowFunctionExpression,
	body: TSESTree.ArrowFunctionExpression["body"],
	sourceCode: TSESLint.SourceCode,
): boolean {
	const arrowToken = getArrowToken(node, sourceCode);
	return Boolean(arrowToken && sourceCode.commentsExistBetween(arrowToken, body));
}

function create(
	context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
): TSESLint.RuleListener {
	return {
		ArrowFunctionExpression: (node) => {
			if (node.body.type === AST_NODE_TYPES.BlockStatement) {
				handleBlockStatement(context, node);
			} else {
				handleExpressionBody(context, node);
			}
		},
	};
}

function createExplicitReturnText(
	body: TSESTree.ArrowFunctionExpression["body"],
	sourceCode: TSESLint.SourceCode,
): string {
	const bodyText = sourceCode.getText(body);

	const firstBodyToken = sourceCode.getFirstToken(body);
	const lastBodyToken = sourceCode.getLastToken(body);

	if (
		firstBodyToken &&
		lastBodyToken &&
		ASTUtils.isOpeningParenToken(firstBodyToken) &&
		ASTUtils.isClosingParenToken(lastBodyToken)
	) {
		return `{ return ${bodyText.slice(1, -1)} }`;
	}

	return `{ return ${bodyText} }`;
}

function createImplicitReturnFix(
	options: ImplicitReturnFixOptions,
): (fixer: TSESLint.RuleFixer) => Array<TSESLint.RuleFix> {
	const { closingBrace, openingBrace, returnStatement, returnValue, sourceCode } = options;
	return (fixer) => {
		const returnText = sourceCode.getText(returnValue);
		const replacement = isObjectLiteral(returnValue) ? `(${returnText})` : returnText;

		const returnLine = sourceCode.lines[returnStatement.loc.start.line - 1];
		assert(returnLine !== undefined, "Return line should not be undefined");
		const indentMatch = returnLine.match(/^(\s*)/);
		const indent = indentMatch ? indentMatch[1] : "";

		const textAfterClosingBrace = sourceCode.text.substring(closingBrace.range[1]);
		const nextNonWhitespaceMatch = textAfterClosingBrace.match(/^(\s*)(\S)/);
		const hasFollowingToken = nextNonWhitespaceMatch && nextNonWhitespaceMatch[2] !== "\n";

		let replacementText = `\n${indent}${replacement}`;
		if (hasFollowingToken === true) {
			const openingBraceLine = sourceCode.lines[openingBrace.loc.start.line - 1];
			assert(openingBraceLine !== undefined, "Opening brace line should not be undefined");
			const openingBraceIndentMatch = openingBraceLine.match(/^(\s*)/);
			const openingBraceIndent = openingBraceIndentMatch ? openingBraceIndentMatch[1] : "";
			replacementText += `\n${openingBraceIndent}`;
		}

		return [
			fixer.replaceTextRange([openingBrace.range[0], closingBrace.range[1]], replacementText),
		];
	};
}

function generateReturnCommentFixes(
	fixer: TSESLint.RuleFixer,
	node: TSESTree.ArrowFunctionExpression,
	body: TSESTree.ArrowFunctionExpression["body"],
	sourceCode: TSESLint.SourceCode,
): Array<TSESLint.RuleFix> {
	const fixes: Array<TSESLint.RuleFix> = [];
	const arrowToken = getArrowToken(node, sourceCode);
	if (arrowToken) {
		fixes.push(
			fixer.insertTextAfter(arrowToken, " {"),
			fixer.insertTextBefore(body, "return "),
			fixer.insertTextAfter(body, "\n}"),
		);
	}

	return fixes;
}

function getArrowRoot(
	node: TSESTree.ArrowFunctionExpression,
	parent: TSESTree.Node,
): TSESTree.Node {
	return isCallExpression(parent) ? node : (getArrowVariableDeclaration(parent) ?? parent);
}

function getArrowToken(
	node: TSESTree.ArrowFunctionExpression,
	sourceCode: TSESLint.SourceCode,
): TSESTree.Token | undefined {
	const tokens = sourceCode.getTokens(node);
	return tokens.find(ASTUtils.isArrowToken);
}

function getArrowVariableDeclaration(
	node: TSESTree.Node,
): TSESTree.VariableDeclaration | undefined {
	return isVariableDeclaration(node.parent) ? node.parent : undefined;
}

function getBlockStatementTokens(
	sourceCode: TSESLint.SourceCode,
	body: TSESTree.BlockStatement,
	returnStatement: TSESTree.ReturnStatement,
): {
	closingBrace: null | TSESTree.Token;
	firstToken: null | TSESTree.Token;
	lastToken: null | TSESTree.Token;
	openingBrace: null | TSESTree.Token;
} {
	return {
		closingBrace: sourceCode.getLastToken(body),
		firstToken: sourceCode.getFirstToken(returnStatement, 1),
		lastToken: sourceCode.getLastToken(returnStatement),
		openingBrace: sourceCode.getFirstToken(body),
	};
}

function getLength(node: TSESTree.NodeOrTokenData): number {
	return node.loc.end.column - node.loc.start.column;
}

function getRuleOptions(context: TSESLint.RuleContext<MessageIds, Options>): {
	jsxAlwaysUseExplicitReturn?: boolean;
	maxLength: number;
	namedExportsAlwaysExplicit: boolean;
} {
	const [options] = context.options;

	return {
		/* eslint-disable ts/no-non-null-assertion -- Options are guaranteed to have these properties */
		jsxAlwaysUseExplicitReturn: options.jsxAlwaysUseExplicitReturn!,
		maxLength: options.maxLen!,
		namedExportsAlwaysExplicit: options.namedExportsAlwaysUseExplicitReturn!,
		/* eslint-enable ts/no-non-null-assertion */
	};
}

function getTokensLength(node: TSESTree.Node, sourceCode: TSESLint.SourceCode): number {
	const tokens = sourceCode.getTokens(node);

	const implicitReturnTokens = tokens
		.filter(ASTUtils.isNotOpeningBraceToken)
		.filter((x) => x.type !== AST_TOKEN_TYPES.Keyword || x.value !== "return")
		.filter(ASTUtils.isNotClosingBraceToken)
		.filter(ASTUtils.isNotSemicolonToken);

	return implicitReturnTokens.reduce((accumulator, token) => accumulator + getLength(token), 0);
}

function handleBlockStatement(
	context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
	node: TSESTree.ArrowFunctionExpression,
): void {
	const blockBody = (node.body as TSESTree.BlockStatement).body;
	if (blockBody.length !== 1) {
		return;
	}

	const returnStatement = blockBody[0];
	if (returnStatement?.type !== AST_NODE_TYPES.ReturnStatement) {
		return;
	}

	const returnValue = returnStatement.argument;
	if (!returnValue) {
		return;
	}

	processImplicitReturn(context, node, returnStatement, returnValue);
}

function handleExpressionBody(
	context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
	node: TSESTree.ArrowFunctionExpression,
): void {
	if (shouldUseExplicitReturn(context, node)) {
		reportExplicitReturn(context, node);
	}
}

function handleParenthesesRemoval(
	fixer: TSESLint.RuleFixer,
	firstToken: null | TSESTree.Token,
	lastToken: null | TSESTree.Token,
): Array<TSESLint.RuleFix> {
	const fixes: Array<TSESLint.RuleFix> = [];
	if (
		firstToken &&
		lastToken &&
		ASTUtils.isOpeningParenToken(firstToken) &&
		ASTUtils.isClosingParenToken(lastToken)
	) {
		fixes.push(fixer.remove(firstToken), fixer.remove(lastToken));
	}

	return fixes;
}

function isCallExpression(node?: TSESTree.Node): node is TSESTree.CallExpression {
	return node?.type === AST_NODE_TYPES.CallExpression;
}

function isJsxElement(node: TSESTree.NodeOrTokenData): boolean {
	return (
		(node as TSESTree.Node).type === AST_NODE_TYPES.JSXElement ||
		(node as TSESTree.Node).type === AST_NODE_TYPES.JSXFragment
	);
}

function isMaxLength(
	node: TSESTree.Node,
	maxLength: number,
	sourceCode: TSESLint.SourceCode,
): boolean {
	return getTokensLength(node, sourceCode) > maxLength;
}

function isMultiline(node: TSESTree.NodeOrTokenData): boolean {
	return node.loc.start.line !== node.loc.end.line;
}

function isNamedExport(node: TSESTree.Node): boolean {
	return node.parent?.parent?.type === AST_NODE_TYPES.ExportNamedDeclaration;
}

function isObjectLiteral(node: TSESTree.NodeOrTokenData): boolean {
	return (node as TSESTree.Node).type === AST_NODE_TYPES.ObjectExpression;
}

function isVariableDeclaration(node?: TSESTree.Node): node is TSESTree.VariableDeclaration {
	return node?.type === AST_NODE_TYPES.VariableDeclaration;
}

// eslint-disable-next-line max-lines-per-function -- Function is large due to multiple checks and fixes
function processImplicitReturn(
	context: TSESLint.RuleContext<MessageIds, Options>,
	node: TSESTree.ArrowFunctionExpression,
	returnStatement: TSESTree.ReturnStatement,
	returnValue: TSESTree.Expression,
): void {
	if (shouldSkipImplicitReturn(context, node, returnValue)) {
		return;
	}

	const { sourceCode } = context;
	const body = node.body as TSESTree.BlockStatement;
	const tokens = getBlockStatementTokens(sourceCode, body, returnStatement);
	const { closingBrace, firstToken, lastToken, openingBrace } = tokens;
	if (!openingBrace || !closingBrace || !firstToken || !lastToken) {
		return;
	}

	const commentsExist =
		sourceCode.commentsExistBetween(openingBrace, firstToken) ||
		sourceCode.commentsExistBetween(lastToken, closingBrace);
	if (commentsExist) {
		return;
	}

	context.report({
		fix: createImplicitReturnFix({
			closingBrace,
			openingBrace,
			returnStatement,
			returnValue,
			sourceCode,
		}),
		messageId: IMPLICIT_RETURN_VIOLATION,
		node,
	});
}

function reportExplicitReturn(
	context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
	node: TSESTree.ArrowFunctionExpression,
): void {
	const { body } = node;
	const { sourceCode } = context;

	const firstToken = sourceCode.getTokenBefore(body);
	const lastToken = sourceCode.getTokenAfter(body);
	const commentsExist = commentsExistBetweenTokens(node, body, sourceCode);

	context.report({
		fix: (fixer) => {
			const fixes: Array<TSESLint.RuleFix> = [];

			fixes.push(...handleParenthesesRemoval(fixer, firstToken, lastToken));

			if (commentsExist) {
				fixes.push(...generateReturnCommentFixes(fixer, node, body, sourceCode));
			} else {
				const returnText = createExplicitReturnText(body, sourceCode);
				fixes.push(fixer.replaceText(body, returnText));
			}

			return fixes;
		},
		messageId: EXPLICIT_RETURN_VIOLATION,
		node,
	});
}

function shouldSkipImplicitReturn(
	context: TSESLint.RuleContext<MessageIds, Options>,
	node: TSESTree.ArrowFunctionExpression,
	returnValue: TSESTree.Expression,
): boolean {
	const { sourceCode } = context;
	const arrowRoot = getArrowRoot(node, node.parent);

	const { jsxAlwaysUseExplicitReturn, maxLength, namedExportsAlwaysExplicit } =
		getRuleOptions(context);

	return (
		isMaxLength(arrowRoot, maxLength, sourceCode) ||
		isMaxLength(returnValue, maxLength, sourceCode) ||
		isMultiline(returnValue) ||
		(Boolean(jsxAlwaysUseExplicitReturn) && isJsxElement(returnValue)) ||
		(namedExportsAlwaysExplicit && isNamedExport(node.parent))
	);
}

function shouldUseExplicitReturn(
	context: TSESLint.RuleContext<MessageIds, Options>,
	node: TSESTree.ArrowFunctionExpression,
): boolean {
	const { sourceCode } = context;
	const { body, parent } = node;

	const commentsExist = commentsExistBetweenTokens(node, body, sourceCode);
	const arrowRoot = getArrowRoot(node, parent);

	const { jsxAlwaysUseExplicitReturn, maxLength, namedExportsAlwaysExplicit } =
		getRuleOptions(context);

	return (
		commentsExist ||
		isMaxLength(arrowRoot, maxLength, sourceCode) ||
		isMultiline(body) ||
		(Boolean(jsxAlwaysUseExplicitReturn) && isJsxElement(body)) ||
		(namedExportsAlwaysExplicit && isNamedExport(parent))
	);
}

const defaultOptions: Options = [
	{
		jsxAlwaysUseExplicitReturn: false,
		maxLen: 80,
		namedExportsAlwaysUseExplicitReturn: true,
	},
];

export const arrowReturnStyleRule = createEslintRule({
	create,
	defaultOptions,
	meta: {
		defaultOptions: [defaultOptions[0]],
		docs: {
			description:
				"Enforce consistent arrow function return style based on length, multiline expressions, JSX usage, and export context",
			recommended: true,
			requiresTypeChecking: false,
		},
		fixable: "code",
		messages,
		schema: [
			{
				additionalProperties: true,
				properties: {
					jsxAlwaysUseExplicitReturn: {
						description: "Always use explicit return for JSX elements",
						type: "boolean",
					},
					maxLen: {
						description: "Maximum line length before requiring explicit return",
						type: "number",
					},
					namedExportsAlwaysUseExplicitReturn: {
						description: "Always use explicit return for named exports",
						type: "boolean",
					},
				},
				type: "object",
			},
		],
		type: "suggestion",
	},
	name: RULE_NAME,
});
