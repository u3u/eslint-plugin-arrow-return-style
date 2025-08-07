import { AST_NODE_TYPES, AST_TOKEN_TYPES, ASTUtils, type TSESTree } from "@typescript-eslint/utils";

import { createRule } from "../utils/create-rule";

type MessageIds = "useExplicitReturn" | "useImplicitReturn";

type Options = [
	{
		jsxAlwaysUseExplicitReturn?: boolean;
		maxLen?: number;
		namedExportsAlwaysUseExplicitReturn?: boolean;
	},
];

export const RULE_NAME = "arrow-return-style";

export const arrowReturnStyleRule = createRule<Options, MessageIds>({
	create: (context) => {
		const sourceCode = context.getSourceCode();

		return {
			ArrowFunctionExpression: (arrowFunction) => {
				const { body: arrowBody, parent: arrowFunctionParent } = arrowFunction;

				const {
					jsxAlwaysUseExplicitReturn,
					maxLen: maxLength = 80,
					namedExportsAlwaysUseExplicitReturn = true,
				} = context.options?.[0] || {};

				const isMaxLength = (node: TSESTree.Node = getArrowRoot()) => {
					return getTokensLength(node) > maxLength;
				};

				const isMultiline = (node: TSESTree.NodeOrTokenData = arrowBody) => {
					return node.loc.start.line !== node.loc.end.line;
				};

				const isObjectLiteral = (node: TSESTree.NodeOrTokenData = arrowBody) => {
					return node.type === AST_NODE_TYPES.ObjectExpression;
				};

				const isJsxElement = (node: TSESTree.NodeOrTokenData = arrowBody) => {
					return (
						node.type === AST_NODE_TYPES.JSXElement ||
						node.type === AST_NODE_TYPES.JSXFragment
					);
				};

				const isNamedExport = () => {
					return (
						arrowFunctionParent.parent?.parent?.type ===
						AST_NODE_TYPES.ExportNamedDeclaration
					);
				};

				const isCallExpression = (
					node?: TSESTree.Node,
				): node is TSESTree.CallExpression => {
					return node?.type === AST_NODE_TYPES.CallExpression;
				};

				const isVariableDeclaration = (
					node?: TSESTree.Node,
				): node is TSESTree.VariableDeclaration => {
					return node?.type === AST_NODE_TYPES.VariableDeclaration;
				};

				const getArrowVariableDeclaration = () => {
					return isVariableDeclaration(arrowFunctionParent.parent)
						? arrowFunctionParent.parent
						: undefined;
				};

				const getArrowRoot = () => {
					return isCallExpression(arrowFunctionParent)
						? arrowFunction
						: getArrowVariableDeclaration() || arrowFunctionParent;
				};

				const getLength = (node: TSESTree.NodeOrTokenData) => {
					return node.loc.end.column - node.loc.start.column;
				};

				const getTokensLength = (node: TSESTree.Node = getArrowRoot()) => {
					const tokens = sourceCode.getTokens(node);

					const implicitReturnTokens = tokens
						.filter(ASTUtils.isNotOpeningBraceToken)
						.filter((x) => x.type !== AST_TOKEN_TYPES.Keyword || x.value !== "return")
						.filter(ASTUtils.isNotClosingBraceToken)
						.filter(ASTUtils.isNotSemicolonToken);

					// console.log(implicitReturnTokens.map((x) => x.value).join(''));

					return implicitReturnTokens.reduce(
						(accumulator, token) => accumulator + getLength(token),
						0,
					);
				};

				const getArrowToken = () => {
					const tokens = sourceCode.getTokens(arrowFunction);
					return tokens.find(ASTUtils.isArrowToken);
				};

				const commentsExistBetweenArrowTokenAndArrowBody = () => {
					const arrowToken = getArrowToken();

					return arrowToken && sourceCode.commentsExistBetween(arrowToken, arrowBody);
				};

				if (arrowBody.type === AST_NODE_TYPES.BlockStatement) {
					const blockBody = arrowBody.body;

					if (
						blockBody.length === 1 &&
						blockBody[0].type === AST_NODE_TYPES.ReturnStatement
					) {
						const returnStatement = blockBody[0];
						const returnValue = returnStatement.argument;

						if (!returnValue) {
							return;
						}

						if (isMaxLength()) {
							return;
						}

						if (isMaxLength(returnValue)) {
							return;
						}

						if (isMultiline(returnValue)) {
							return;
						}

						if (jsxAlwaysUseExplicitReturn && isJsxElement(returnValue)) {
							return;
						}

						if (namedExportsAlwaysUseExplicitReturn && isNamedExport()) {
							return;
						}

						const openingBrace = sourceCode.getFirstToken(arrowBody)!;
						const closingBrace = sourceCode.getLastToken(arrowBody)!;
						const firstToken = sourceCode.getFirstToken(returnStatement, 1)!;
						const lastToken = sourceCode.getLastToken(returnStatement)!;

						const commentsExist =
							sourceCode.commentsExistBetween(openingBrace, firstToken) ||
							sourceCode.commentsExistBetween(lastToken, closingBrace);

						if (commentsExist) {
							return;
						}

						context.report({
							fix: (fixer) => {
								const fixes = [];
								const returnText = sourceCode.getText(returnValue);

								fixes.push(
									fixer.remove(openingBrace),
									fixer.remove(closingBrace),
									fixer.replaceText(
										returnStatement,
										isObjectLiteral(returnValue)
											? `(${returnText})`
											: returnText,
									),
								);

								return fixes;
							},

							messageId: "useImplicitReturn",
							node: arrowFunction,
						});
					}
				} else {
					const commentsExist = commentsExistBetweenArrowTokenAndArrowBody();

					if (
						//
						commentsExist ||
						isMaxLength() ||
						isMultiline() ||
						(jsxAlwaysUseExplicitReturn && isJsxElement()) ||
						(namedExportsAlwaysUseExplicitReturn && isNamedExport())
					) {
						context.report({
							fix: (fixer) => {
								const fixes = [];
								const firstToken = sourceCode.getTokenBefore(arrowBody);
								const lastToken = sourceCode.getTokenAfter(arrowBody);

								if (
									firstToken &&
									lastToken &&
									ASTUtils.isOpeningParenToken(firstToken) &&
									ASTUtils.isClosingParenToken(lastToken)
								) {
									fixes.push(fixer.remove(firstToken), fixer.remove(lastToken));
								}

								if (commentsExist) {
									const arrowToken = getArrowToken()!;

									fixes.push(
										fixer.insertTextAfter(arrowToken, " {"),
										fixer.insertTextBefore(arrowBody, "return "),
										fixer.insertTextAfter(arrowBody, "\n}"),
									);
								} else {
									fixes.push(
										fixer.replaceText(
											arrowBody,
											`{ return ${sourceCode.getText(arrowBody)} }`,
										),
									);
								}

								return fixes;
							},

							messageId: "useExplicitReturn",
							node: arrowFunction,
						});
					}
				}
			},
		};
	},

	defaultOptions: [
		{
			jsxAlwaysUseExplicitReturn: false,
			maxLen: 80,
			namedExportsAlwaysUseExplicitReturn: true,
		},
	],

	meta: {
		docs: {
			description: "Enforce arrow function return style",
		},

		fixable: "code",

		messages: {
			useExplicitReturn: "Use explicit return for multiline arrow function bodies.",
			useImplicitReturn: "Use implicit return for single-line arrow function bodies.",
		},

		schema: [
			{
				additionalProperties: true,

				properties: {
					jsxAlwaysUseExplicitReturn: { default: false, type: "boolean" },
					maxLen: { default: 80, type: "number" },
					namedExportsAlwaysUseExplicitReturn: { default: true, type: "boolean" },
				},

				type: "object",
			},
		],

		type: "suggestion",
	},

	name: RULE_NAME,
});
