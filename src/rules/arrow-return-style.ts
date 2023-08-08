import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils/create-rule';

type Options = [
  {
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
        const { maxLen = 80 } = context.options[0] || {};

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
            if (isJsxElement(returnValue)) return;

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
        } else if (isMultiline() || isMaxLen() || isJsxElement() || isNamedExport()) {
          context.report({
            fix: (fixer) => {
              const fixes = [];

              if (isObjectLiteral()) {
                fixes.push(
                  fixer.remove(sourceCode.getTokenBefore(arrowBody)!),
                  fixer.remove(sourceCode.getTokenAfter(arrowBody)!)
                );
              }

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
          maxLen: { type: 'number' },
        },

        type: 'object',
      },
    ],

    type: 'suggestion',
  },

  name: RULE_NAME,
});
