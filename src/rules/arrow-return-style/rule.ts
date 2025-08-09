import { AST_NODE_TYPES, ASTUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";

import detectIndent from "detect-indent";

import { createEslintRule } from "../../util";

const indentCache = new WeakMap<TSESLint.SourceCode, string>();

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

interface ExplicitReturnFixContext {
	arrowToken: TSESTree.Token;
	body: TSESTree.ArrowFunctionExpression["body"];
	fixer: TSESLint.RuleFixer;
	node: TSESTree.ArrowFunctionExpression;
	sourceCode: TSESLint.SourceCode;
}

interface ImplicitReturnFixOptions {
	closingBrace: TSESTree.Token;
	openingBrace: TSESTree.Token;
	returnStatement: TSESTree.ReturnStatement;
	returnValue: TSESTree.Expression;
	sourceCode: TSESLint.SourceCode;
}

function adjustJsxIndentation(bodyText: string, indentUnit: string): string {
	const bodyLines = bodyText.split("\n");
	if (bodyLines.length <= 1) {
		return bodyText;
	}

	const adjustedLines = bodyLines.map((line, index) => {
		if (index === 0) {
			return line;
		}

		return line.trim() === "" ? line : indentUnit + line;
	});

	return adjustedLines.join("\n");
}

function calculateImplicitLength(
	returnValue: TSESTree.BlockStatement | TSESTree.Expression,
	sourceCode: TSESLint.SourceCode,
	node: TSESTree.ArrowFunctionExpression,
): number {
	const returnValueText = sourceCode.getText(returnValue);
	const arrowToken = getArrowToken(node, sourceCode);
	const beforeArrow = arrowToken ? sourceCode.text.substring(0, arrowToken.range[1]) : "";
	const lastLineBeforeArrow = beforeArrow.split("\n").pop() ?? "";

	let estimatedSingleLineText = returnValueText;
	if (
		isMultiline(returnValue) &&
		(returnValue.type === AST_NODE_TYPES.ArrayExpression ||
			returnValue.type === AST_NODE_TYPES.ObjectExpression)
	) {
		estimatedSingleLineText = convertMultilineToSingleLine(returnValueText);
	}

	return lastLineBeforeArrow.length + 1 + estimatedSingleLineText.length;
}

function commentsExistBetweenTokens(
	node: TSESTree.ArrowFunctionExpression,
	body: TSESTree.ArrowFunctionExpression["body"],
	sourceCode: TSESLint.SourceCode,
): boolean {
	const arrowToken = getArrowToken(node, sourceCode);
	return Boolean(arrowToken && sourceCode.commentsExistBetween(arrowToken, body));
}

function convertMultilineToSingleLine(returnValue: string): string {
	return returnValue
		.replace(/\s+/g, " ")
		.replace(/,\s*([}\]])/g, "$1")
		.replace(/^\s+|\s+$/g, "")
		.replace(/\[\s+/g, "[")
		.replace(/\s+\]/g, "]")
		.replace(/{\s+/g, "{")
		.replace(/\s+}/g, "}");
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
	node: TSESTree.ArrowFunctionExpression,
): string {
	const indentUnit = getIndentStyle(sourceCode);
	let returnValue = normalizeParentheses(body, sourceCode);

	if (
		isMultiline(body) &&
		(body.type === AST_NODE_TYPES.ArrayExpression ||
			body.type === AST_NODE_TYPES.ObjectExpression)
	) {
		returnValue = convertMultilineToSingleLine(returnValue);
	}

	if (isJsxElement(body) && isMultiline(body)) {
		const bodyText = sourceCode.getText(body);
		returnValue = adjustJsxIndentation(bodyText, indentUnit);
	}

	const arrowLine = sourceCode.lines[node.loc.start.line - 1];
	const baseIndentMatch = arrowLine?.match(/^(\s*)/);
	const baseIndent = baseIndentMatch?.[1] ?? "";

	const returnIndent = determineReturnIndentation(body, node, baseIndent, indentUnit);

	return `{\n${returnIndent}return ${returnValue};\n${baseIndent}}`;
}

function createImplicitReturnFix(
	options: ImplicitReturnFixOptions,
): (fixer: TSESLint.RuleFixer) => Array<TSESLint.RuleFix> {
	const { closingBrace, openingBrace, returnValue, sourceCode } = options;
	return (fixer) => {
		const returnText = sourceCode.getText(returnValue);
		const replacement = isObjectLiteral(returnValue) ? `(${returnText})` : returnText;

		return [
			fixer.replaceTextRange([openingBrace.range[0], closingBrace.range[1]], replacement),
		];
	};
}

function determineReturnIndentation(
	body: TSESTree.ArrowFunctionExpression["body"],
	node: TSESTree.ArrowFunctionExpression,
	baseIndent: string,
	indentUnit: string,
): string {
	if (isJsxElement(body)) {
		if (isMultiline(body)) {
			return baseIndent === "" ? indentUnit : baseIndent + indentUnit;
		}

		return baseIndent + indentUnit;
	}

	if (isMultiline(body) && baseIndent === "") {
		return indentUnit;
	}

	if (node.parent.type === AST_NODE_TYPES.Property) {
		return baseIndent + indentUnit;
	}

	return getMethodChainIndentation(node, baseIndent, indentUnit);
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

function getArrowToken(
	node: TSESTree.ArrowFunctionExpression,
	sourceCode: TSESLint.SourceCode,
): TSESTree.Token | undefined {
	const tokens = sourceCode.getTokens(node);
	return tokens.find(ASTUtils.isArrowToken);
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

function getExplicitReturnMessageId(body: TSESTree.ArrowFunctionExpression["body"]): MessageIds {
	return isMultiline(body) &&
		(body.type === AST_NODE_TYPES.ArrayExpression ||
			body.type === AST_NODE_TYPES.ObjectExpression)
		? IMPLICIT_RETURN_VIOLATION
		: EXPLICIT_RETURN_VIOLATION;
}

function getIndentStyle(sourceCode: TSESLint.SourceCode): string {
	const cached = indentCache.get(sourceCode);
	if (cached !== undefined) {
		return cached;
	}

	const detected = detectIndent(sourceCode.text);
	const indentStyle = detected.indent || "\t";

	indentCache.set(sourceCode, indentStyle);
	return indentStyle;
}

function getMethodChainIndentation(
	node: TSESTree.ArrowFunctionExpression,
	baseIndent: string,
	indentUnit: string,
): string {
	let parent: TSESTree.Node | undefined = node.parent;

	while (parent) {
		if (parent.type === AST_NODE_TYPES.CallExpression) {
			const { callee } = parent;
			if (callee.type === AST_NODE_TYPES.MemberExpression) {
				return baseIndent + indentUnit;
			}
		}

		({ parent } = parent);
	}

	return baseIndent + indentUnit;
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

function handleExplicitReturnFix(context: ExplicitReturnFixContext): Array<TSESLint.RuleFix> {
	const { arrowToken, body, fixer, node, sourceCode } = context;
	const returnText = createExplicitReturnText(body, sourceCode, node);
	const tokenAfterBody = sourceCode.getTokenAfter(body);
	const tokenBeforeBody = sourceCode.getTokenBefore(body);

	const isWrappedInParens =
		tokenBeforeBody &&
		tokenAfterBody &&
		ASTUtils.isOpeningParenToken(tokenBeforeBody) &&
		ASTUtils.isClosingParenToken(tokenAfterBody);

	if (
		tokenAfterBody &&
		(ASTUtils.isSemicolonToken(tokenAfterBody) ||
			tokenAfterBody.value === "," ||
			Boolean(isWrappedInParens))
	) {
		return [
			fixer.replaceTextRange(
				[arrowToken.range[1], tokenAfterBody.range[1]],
				` ${returnText}`,
			),
		];
	}

	return [fixer.replaceTextRange([arrowToken.range[1], body.range[1]], ` ${returnText}`)];
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

function hasCommentsInBlock(
	sourceCode: TSESLint.SourceCode,
	tokens: {
		closingBrace: TSESTree.Token;
		firstToken: TSESTree.Token;
		lastToken: TSESTree.Token;
		openingBrace: TSESTree.Token;
	},
): boolean {
	const { closingBrace, firstToken, lastToken, openingBrace } = tokens;
	return (
		sourceCode.commentsExistBetween(openingBrace, firstToken) ||
		sourceCode.commentsExistBetween(lastToken, closingBrace)
	);
}

function isJsxElement(node: TSESTree.Node): boolean {
	return node.type === AST_NODE_TYPES.JSXElement || node.type === AST_NODE_TYPES.JSXFragment;
}

function isMultiline(node: TSESTree.NodeOrTokenData): boolean {
	return node.loc.start.line !== node.loc.end.line;
}

function isNamedExport(node: TSESTree.Node): boolean {
	return node.parent?.parent?.type === AST_NODE_TYPES.ExportNamedDeclaration;
}

function isObjectLiteral(node: TSESTree.Node): boolean {
	return node.type === AST_NODE_TYPES.ObjectExpression;
}

function normalizeParentheses(
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
		return bodyText.slice(1, -1);
	}

	return bodyText;
}

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

	if (!validateImplicitReturnTokens(tokens)) {
		return;
	}

	if (hasCommentsInBlock(sourceCode, tokens)) {
		return;
	}

	context.report({
		fix: createImplicitReturnFix({
			closingBrace: tokens.closingBrace,
			openingBrace: tokens.openingBrace,
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
			if (commentsExist) {
				return [
					...handleParenthesesRemoval(fixer, firstToken, lastToken),
					...generateReturnCommentFixes(fixer, node, body, sourceCode),
				];
			}

			const arrowToken = getArrowToken(node, sourceCode);
			if (!arrowToken) {
				return [];
			}

			return handleExplicitReturnFix({ arrowToken, body, fixer, node, sourceCode });
		},
		messageId: getExplicitReturnMessageId(body),
		node,
	});
}

function shouldSkipImplicitReturn(
	context: TSESLint.RuleContext<MessageIds, Options>,
	node: TSESTree.ArrowFunctionExpression,
	returnValue: TSESTree.Expression,
): boolean {
	const { sourceCode } = context;

	const { jsxAlwaysUseExplicitReturn, maxLength, namedExportsAlwaysExplicit } =
		getRuleOptions(context);

	const estimatedImplicitLength = calculateImplicitLength(returnValue, sourceCode, node);

	return (
		estimatedImplicitLength > maxLength ||
		(isMultiline(returnValue) &&
			returnValue.type !== AST_NODE_TYPES.ArrayExpression &&
			returnValue.type !== AST_NODE_TYPES.ObjectExpression) ||
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

	const { jsxAlwaysUseExplicitReturn, maxLength, namedExportsAlwaysExplicit } =
		getRuleOptions(context);

	// Check if converting to single line would be too long
	const estimatedImplicitLength = calculateImplicitLength(body, sourceCode, node);
	const wouldBeTooLong = estimatedImplicitLength > maxLength;

	// Use explicit return if:
	// - There are comments that would be lost
	// - Converting to single-line implicit would exceed max length
	// - JSX should always use explicit (and this is JSX)
	// - Named exports should always use explicit (and this is named export)
	// - Body is multiline (any multiline body should use explicit return)
	return (
		commentsExist ||
		wouldBeTooLong ||
		isMultiline(body) ||
		(Boolean(jsxAlwaysUseExplicitReturn) && isJsxElement(body)) ||
		(namedExportsAlwaysExplicit && isNamedExport(parent))
	);
}

function validateImplicitReturnTokens(tokens: {
	closingBrace: null | TSESTree.Token;
	firstToken: null | TSESTree.Token;
	lastToken: null | TSESTree.Token;
	openingBrace: null | TSESTree.Token;
}): tokens is {
	closingBrace: TSESTree.Token;
	firstToken: TSESTree.Token;
	lastToken: TSESTree.Token;
	openingBrace: TSESTree.Token;
} {
	const { closingBrace, firstToken, lastToken, openingBrace } = tokens;
	return !!(openingBrace && closingBrace && firstToken && lastToken);
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
