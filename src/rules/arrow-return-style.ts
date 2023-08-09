import { AST_NODE_TYPES, ASTUtils } from '@typescript-eslint/utils';
import { createRule } from '../utils/create-rule';

type Options = [
  {
    jsxAlwaysUseExplicitReturn?: boolean;
    maxLen?: number;
  }
];

type MessageIds = 'useExplicitReturn' | 'useImplicitReturn';

export const RULE_NAME = 'arrow-return-style';

export const arrowReturnStyleRule = createRule<Options, MessageIds>({
  create: (context) => {
    const sourceCode = context.getSourceCode();

    return {
      ArrowFunctionExpression: (arrowFunction) => {
        const { body: arrowBody, parent: arrowFunctionParent } = arrowFunction;
        const { jsxAlwaysUseExplicitReturn, maxLen = 80 } = context.options?.[0] || {};

        const isMaxLen = (node = arrowBody) => node.loc.end.column - node.loc.start.column >= maxLen;
        const isMultiline = (node = arrowBody) => node.loc.start.line !== node.loc.end.line;
        const isObjectLiteral = (node = arrowBody) => node.type === AST_NODE_TYPES.ObjectExpression;

        const isJsxElement = (node = arrowBody) => {
          return node.type === AST_NODE_TYPES.JSXElement || node.type === AST_NODE_TYPES.JSXFragment;
        };

        const isNamedExport = () => {
          return arrowFunctionParent.parent?.parent?.type === AST_NODE_TYPES.ExportNamedDeclaration;
        };

        if (arrowBody.type === AST_NODE_TYPES.BlockStatement) {
          const blockBody = arrowBody.body;

          if (blockBody.length === 1 && blockBody[0].type === AST_NODE_TYPES.ReturnStatement) {
            const returnStatement = blockBody[0];
            const returnValue = returnStatement.argument;

            if (!returnValue) return;
            if (isNamedExport()) return;
            if (isMaxLen(returnValue)) return;
            if (isMultiline(returnValue)) return;
            if (jsxAlwaysUseExplicitReturn && isJsxElement(returnValue)) return;

            const openingBrace = sourceCode.getFirstToken(arrowBody)!;
            const closingBrace = sourceCode.getLastToken(arrowBody)!;
            const firstToken = sourceCode.getFirstToken(returnStatement, 1)!;
            const lastToken = sourceCode.getLastToken(returnStatement)!;

            const commentsExist =
              sourceCode.commentsExistBetween(openingBrace, firstToken) ||
              sourceCode.commentsExistBetween(lastToken, closingBrace);

            if (commentsExist) return;

            context.report({
              fix: (fixer) => {
                const fixes = [];
                const returnText = sourceCode.getText(returnValue);

                fixes.push(
                  fixer.remove(openingBrace),
                  fixer.remove(closingBrace),
                  fixer.replaceText(returnStatement, isObjectLiteral(returnValue) ? `(${returnText})` : returnText)
                );

                return fixes;
              },

              messageId: 'useImplicitReturn',
              node: arrowFunction,
            });
          }
        } else if (
          //
          isMaxLen() ||
          isMultiline() ||
          isNamedExport() ||
          (jsxAlwaysUseExplicitReturn && isJsxElement())
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
              )
                fixes.push(fixer.remove(firstToken), fixer.remove(lastToken));

              fixes.push(fixer.replaceText(arrowBody, `{ return ${sourceCode.getText(arrowBody)} }`));

              return fixes;
            },

            messageId: 'useExplicitReturn',
            node: arrowFunction,
          });
        }
      },
    };
  },

  defaultOptions: [
    {
      jsxAlwaysUseExplicitReturn: false,
      maxLen: 80,
    },
  ],

  meta: {
    docs: {
      description: 'Enforce arrow function return style',
    },

    fixable: 'code',

    messages: {
      useExplicitReturn: 'Use explicit return for multiline arrow function bodies.',
      useImplicitReturn: 'Use implicit return for single-line arrow function bodies.',
    },

    schema: [
      {
        additionalProperties: true,

        properties: {
          jsxAlwaysUseExplicitReturn: { default: false, type: 'boolean' },
          maxLen: { default: 80, type: 'number' },
        },

        type: 'object',
      },
    ],

    type: 'suggestion',
  },

  name: RULE_NAME,
});
