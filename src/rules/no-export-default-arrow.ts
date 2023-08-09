import path from 'node:path';
import { AST_NODE_TYPES, ASTUtils, type TSESTree } from '@typescript-eslint/utils';
import { camelCase } from 'scule';
import { createRule } from '../utils/create-rule';

export const RULE_NAME = 'no-export-default-arrow';

export const noExportDefaultArrowRule = createRule({
  create: (context) => {
    const sourceCode = context.getSourceCode();
    let program: TSESTree.Program;

    return {
      ArrowFunctionExpression: (arrowFunction) => {
        const { body: arrowBody, parent: arrowFunctionParent } = arrowFunction;

        if (arrowFunctionParent.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
          context.report({
            fix: (fixer) => {
              const fixes = [];
              const lastToken = sourceCode.getLastToken(program, { includeComments: true }) || arrowFunctionParent;
              const fileName = context.getPhysicalFilename?.() || context.getFilename() || 'namedFunction';
              const { name: fileNameWithoutExtension } = path.parse(fileName);
              const funcName = camelCase(fileNameWithoutExtension);

              fixes.push(
                fixer.replaceText(arrowFunctionParent, `const ${funcName} = ${sourceCode.getText(arrowFunction)}`),
                fixer.insertTextAfter(lastToken, `\n\nexport default ${funcName}`)
              );

              return fixes;
            },

            messageId: 'disallowExportDefaultArrow',
            node: arrowFunction,
          });
        }
      },

      Program: (node) => (program = node),
    };
  },

  defaultOptions: [],

  meta: {
    docs: {
      description:
        'Disallow export default anonymous arrow function<br/>_**Automatically fix using the current file name.**_',
    },

    fixable: 'code',

    messages: {
      disallowExportDefaultArrow: 'Disallow export default anonymous arrow function',
    },

    schema: [],

    type: 'suggestion',
  },

  name: RULE_NAME,
});
