import { AST_NODE_TYPES, ASTUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";

import detectIndent from "detect-indent";

import { createEslintRule } from "../../util";
import { formatWithPrettier, isPrettierAvailable } from "../../utils/prettier-format";

const indentCache = new WeakMap<TSESLint.SourceCode, string>();

const ObjectReturnStyle = {
	AlwaysExplicit: "always-explicit",
	ComplexExplicit: "complex-explicit",
	Off: "off",
} as const;

type ObjectReturnStyle = (typeof ObjectReturnStyle)[keyof typeof ObjectReturnStyle];

type Options = [
	{
		jsxAlwaysUseExplicitReturn?: boolean;
		maxLen?: number;
		maxObjectProperties?: number;
		namedExportsAlwaysUseExplicitReturn?: boolean;
		objectReturnStyle?: ObjectReturnStyle;
		usePrettier?: boolean;
	},
];

export const RULE_NAME = "arrow-return-style";

const IMPLICIT_RETURN_VIOLATION = "use-implicit-return";
const EXPLICIT_RETURN_VIOLATION = "use-explicit-return";
const EXPLICIT_RETURN_COMPLEX = "use-explicit-return-complex";

type MessageIds =
	| typeof EXPLICIT_RETURN_COMPLEX
	| typeof EXPLICIT_RETURN_VIOLATION
	| typeof IMPLICIT_RETURN_VIOLATION;

const messages = {
	[EXPLICIT_RETURN_COMPLEX]: "Use explicit return for complex {{type}} expressions.",
	[EXPLICIT_RETURN_VIOLATION]: "Use explicit return for arrow function bodies.",
	[IMPLICIT_RETURN_VIOLATION]: "Use implicit return for arrow function bodies.",
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

/**
 * Builds the complete code for prettier formatting.
 *
 * @param returnValue - The return value expression.
 * @param sourceCode - ESLint source code object.
 * @param node - The arrow function node.
 * @returns Complete code string for prettier formatting, or null if unable to
 *   build.
 */
function buildPrettierCode(
	returnValue: TSESTree.BlockStatement | TSESTree.Expression,
	sourceCode: TSESLint.SourceCode,
	node: TSESTree.ArrowFunctionExpression,
): null | string {
	const returnValueText = sourceCode.getText(returnValue);
	const nodeText = sourceCode.getText(node);
	const arrowIndex = nodeText.indexOf(" => ");

	if (arrowIndex === -1) {
		return null;
	}

	const parameters = nodeText.substring(0, arrowIndex);
	let implicitReturnText = returnValueText;

	if (isObjectLiteral(returnValue)) {
		implicitReturnText = `(${returnValueText})`;
	}

	return `const temp = ${parameters} => ${implicitReturnText}`;
}

function calcPrettierImplicitLength(
	returnValue: TSESTree.BlockStatement | TSESTree.Expression,
	context: TSESLint.RuleContext<MessageIds, Options>,
	node: TSESTree.ArrowFunctionExpression,
): { isMultiline: boolean; length: number } {
	const { sourceCode } = context;

	const fullImplicitCode = buildPrettierCode(returnValue, sourceCode, node);
	if (fullImplicitCode === null) {
		return createPrettierFallbackResult(returnValue, sourceCode, node);
	}

	const prettierResult = formatWithPrettier(fullImplicitCode, context);
	if (prettierResult.error !== undefined) {
		return createPrettierFallbackResult(returnValue, sourceCode, node);
	}

	const prefixLength = "const temp = ".length;
	const actualLength = Math.max(0, prettierResult.lineLength - prefixLength);

	return {
		isMultiline: prettierResult.isMultiline,
		length: actualLength,
	};
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

function checkForceExplicitForObject(
	body: TSESTree.ArrowFunctionExpression["body"],
	options: {
		maxObjectProperties: number;
		objectReturnStyle: ObjectReturnStyle;
	},
): boolean {
	if (body.type === AST_NODE_TYPES.ObjectExpression) {
		return shouldForceObjectExplicit(body, options);
	}

	if (body.type === AST_NODE_TYPES.ArrayExpression) {
		return shouldForceArrayExplicit(body, options);
	}

	return false;
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

function countObjectProperties(node: TSESTree.ObjectExpression): number {
	return node.properties.length;
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

/**
 * Creates a fallback result when prettier formatting fails.
 *
 * @param returnValue - The return value expression.
 * @param sourceCode - ESLint source code object.
 * @param node - The arrow function node.
 * @returns Object with multiline status and length information.
 */
function createPrettierFallbackResult(
	returnValue: TSESTree.BlockStatement | TSESTree.Expression,
	sourceCode: TSESLint.SourceCode,
	node: TSESTree.ArrowFunctionExpression,
): { isMultiline: boolean; length: number } {
	return {
		isMultiline: isMultiline(returnValue),
		length: calculateImplicitLength(returnValue, sourceCode, node),
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

function getImplicitReturnMetrics(
	context: TSESLint.RuleContext<MessageIds, Options>,
	node: TSESTree.ArrowFunctionExpression,
	returnValue: TSESTree.BlockStatement | TSESTree.Expression,
): { estimatedLength: number; wouldBeMultiline: boolean } {
	const { sourceCode } = context;
	const { usePrettier } = getRuleOptions(context);

	if (usePrettier) {
		const prettierResult = calcPrettierImplicitLength(returnValue, context, node);
		return {
			estimatedLength: prettierResult.length,
			wouldBeMultiline: prettierResult.isMultiline,
		};
	}

	const estimatedLength = calculateImplicitLength(returnValue, sourceCode, node);
	const wouldBeMultiline =
		isMultiline(returnValue) &&
		returnValue.type !== AST_NODE_TYPES.ArrayExpression &&
		returnValue.type !== AST_NODE_TYPES.ObjectExpression;

	return { estimatedLength, wouldBeMultiline };
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

function getReportData(
	body: TSESTree.ArrowFunctionExpression["body"],
	isObjectArrayRule: boolean,
): undefined | { type: string } {
	return isObjectArrayRule
		? { type: body.type === AST_NODE_TYPES.ObjectExpression ? "object" : "array" }
		: undefined;
}

function getReportMessageId(
	body: TSESTree.ArrowFunctionExpression["body"],
	isObjectArrayRule: boolean,
): MessageIds {
	return isObjectArrayRule ? EXPLICIT_RETURN_COMPLEX : getExplicitReturnMessageId(body);
}

function getRuleOptions(context: TSESLint.RuleContext<MessageIds, Options>): {
	jsxAlwaysUseExplicitReturn?: boolean;
	maxLength: number;
	maxObjectProperties: number;
	namedExportsAlwaysExplicit: boolean;
	objectReturnStyle: ObjectReturnStyle;
	usePrettier: boolean;
} {
	const [options] = context.options;

	return {
		/* eslint-disable ts/no-non-null-assertion -- Options are guaranteed to have these properties */
		jsxAlwaysUseExplicitReturn: options.jsxAlwaysUseExplicitReturn!,
		maxLength: options.maxLen!,
		maxObjectProperties: options.maxObjectProperties!,
		namedExportsAlwaysExplicit: options.namedExportsAlwaysUseExplicitReturn!,
		objectReturnStyle: options.objectReturnStyle!,
		usePrettier: options.usePrettier ?? isPrettierAvailable(),
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
	const shouldUseExplicit = shouldUseExplicitReturn(context, node);
	if (shouldUseExplicit) {
		const { body } = node;
		const { maxObjectProperties, objectReturnStyle } = getRuleOptions(context);
		const isObjectArrayRule = checkForceExplicitForObject(body, {
			maxObjectProperties,
			objectReturnStyle,
		});

		reportExplicitReturn(context, node, { isObjectArrayRule });
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

function isComplexArray(node: TSESTree.ArrayExpression): boolean {
	let hasSpread = false;
	let nonSpreadCount = 0;
	let functionCallCount = 0;

	for (const element of node.elements) {
		if (!element) {
			// Handle sparse arrays (holes)
			continue;
		}

		if (element.type === AST_NODE_TYPES.SpreadElement) {
			hasSpread = true;
			continue;
		}

		nonSpreadCount++;

		if (element.type === AST_NODE_TYPES.CallExpression) {
			functionCallCount++;
		}
	}

	// Complex if:
	// - Has spread + other elements combination
	// - Has multiple function calls
	return (hasSpread && nonSpreadCount >= 1) || functionCallCount >= 2;
}

function isComplexObject(node: TSESTree.ObjectExpression): boolean {
	let hasSpread = false;
	let hasComputed = false;
	let functionCallCount = 0;

	for (const property of node.properties) {
		if (property.type === AST_NODE_TYPES.SpreadElement) {
			hasSpread = true;
			continue;
		}

		if (property.computed) {
			hasComputed = true;
		}

		if (property.value.type === AST_NODE_TYPES.CallExpression) {
			functionCallCount++;
		}
	}

	// Complex if:
	// - Has spread + computed combination
	// - Has multiple function calls
	// - Has computed + function call combination
	return (
		(hasSpread && hasComputed) ||
		functionCallCount >= 2 ||
		(hasComputed && functionCallCount >= 1)
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
	options?: { isObjectArrayRule?: boolean },
): void {
	const { body } = node;
	const { sourceCode } = context;
	const isObjectArrayRule = options?.isObjectArrayRule === true;

	const firstToken = sourceCode.getTokenBefore(body);
	const lastToken = sourceCode.getTokenAfter(body);
	const commentsExist = commentsExistBetweenTokens(node, body, sourceCode);

	context.report({
		data: getReportData(body, isObjectArrayRule),
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
		messageId: getReportMessageId(body, isObjectArrayRule),
		node,
	});
}

function shouldForceArrayExplicit(
	node: TSESTree.ArrayExpression,
	options: {
		objectReturnStyle: ObjectReturnStyle;
	},
): boolean {
	const { objectReturnStyle } = options;

	switch (objectReturnStyle) {
		case ObjectReturnStyle.AlwaysExplicit: {
			return true;
		}
		case ObjectReturnStyle.ComplexExplicit: {
			// For arrays, we ignore element count and only check complexity patterns
			return isComplexArray(node);
		}
		case ObjectReturnStyle.Off: {
			return false;
		}
		default: {
			return false;
		}
	}
}

function shouldForceObjectExplicit(
	node: TSESTree.ObjectExpression,
	options: {
		maxObjectProperties: number;
		objectReturnStyle: ObjectReturnStyle;
	},
): boolean {
	const { maxObjectProperties, objectReturnStyle } = options;

	switch (objectReturnStyle) {
		case ObjectReturnStyle.AlwaysExplicit: {
			return true;
		}
		case ObjectReturnStyle.ComplexExplicit: {
			const propertyCount = countObjectProperties(node);
			return propertyCount > maxObjectProperties || isComplexObject(node);
		}
		case ObjectReturnStyle.Off: {
			return false;
		}
		default: {
			return false;
		}
	}
}

function shouldSkipForObjectLogic(
	returnValue: TSESTree.Expression,
	options: {
		maxObjectProperties: number;
		objectReturnStyle: ObjectReturnStyle;
	},
): boolean {
	if (returnValue.type === AST_NODE_TYPES.ObjectExpression) {
		return shouldForceObjectExplicit(returnValue, options);
	}

	if (returnValue.type === AST_NODE_TYPES.ArrayExpression) {
		return shouldForceArrayExplicit(returnValue, options);
	}

	return false;
}

function shouldSkipImplicitReturn(
	context: TSESLint.RuleContext<MessageIds, Options>,
	node: TSESTree.ArrowFunctionExpression,
	returnValue: TSESTree.Expression,
): boolean {
	const {
		jsxAlwaysUseExplicitReturn,
		maxLength,
		maxObjectProperties,
		namedExportsAlwaysExplicit,
		objectReturnStyle,
	} = getRuleOptions(context);

	const { estimatedLength, wouldBeMultiline } = getImplicitReturnMetrics(
		context,
		node,
		returnValue,
	);

	if (shouldSkipForObjectLogic(returnValue, { maxObjectProperties, objectReturnStyle })) {
		return true;
	}

	return (
		estimatedLength > maxLength ||
		wouldBeMultiline ||
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
	const {
		jsxAlwaysUseExplicitReturn,
		maxLength,
		maxObjectProperties,
		namedExportsAlwaysExplicit,
		objectReturnStyle,
	} = getRuleOptions(context);

	const { estimatedLength, wouldBeMultiline } = getImplicitReturnMetrics(context, node, body);
	const wouldBeTooLong = estimatedLength > maxLength;

	// Check for object-specific logic
	if (checkForceExplicitForObject(body, { maxObjectProperties, objectReturnStyle })) {
		return true;
	}

	// Use explicit return if:
	// - There are comments that would be lost
	// - Converting to single-line implicit would exceed max length
	// - JSX should always use explicit (and this is JSX)
	// - Named exports should always use explicit (and this is named export)
	// - Body is multiline (any multiline body should use explicit return)
	return (
		commentsExist ||
		wouldBeTooLong ||
		wouldBeMultiline ||
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
		maxObjectProperties: 2,
		namedExportsAlwaysUseExplicitReturn: true,
		objectReturnStyle: ObjectReturnStyle.ComplexExplicit,
		usePrettier: false,
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
					maxObjectProperties: {
						description:
							"Maximum number of object properties before requiring explicit return (only applies when objectReturnStyle is 'complex-explicit')",
						minimum: 1,
						type: "number",
					},
					namedExportsAlwaysUseExplicitReturn: {
						description: "Always use explicit return for named exports",
						type: "boolean",
					},
					objectReturnStyle: {
						description:
							"Control when object and array returns should use explicit syntax",
						enum: [
							ObjectReturnStyle.AlwaysExplicit,
							ObjectReturnStyle.ComplexExplicit,
							ObjectReturnStyle.Off,
						],
						type: "string",
					},
					usePrettier: {
						description:
							"Use Prettier to determine actual formatted line length (auto-detects Prettier availability if not explicitly set)",
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
