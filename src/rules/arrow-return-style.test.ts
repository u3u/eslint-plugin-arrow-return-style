import { RuleTester } from '@typescript-eslint/rule-tester';
import dedent from 'dedent';
import { afterAll, describe, it } from 'vitest';
import { arrowReturnStyleRule, RULE_NAME } from './arrow-return-style';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',

  parserOptions: {
    ecmaFeatures: { jsx: true },
  },
});

ruleTester.run(RULE_NAME, arrowReturnStyleRule, {
  invalid: [
    {
      code: dedent`
        const UDimTemporary = (value: UDim, rem: number): UDim => new UDim(value.Scale, value.Offset * rem);
      `,

      errors: [{ messageId: 'useExplicitReturn' }],

      output: dedent`
        const UDimTemporary = (value: UDim, rem: number): UDim => { return new UDim(value.Scale, value.Offset * rem) };
      `,
    },

    {
      code: dedent`
        const obj = {
          UDimTemporary11111111111: (value: UDim, rem: number): UDim =>
            new UDim(value.Scale, value.Offset * rem),
        };
      `,

      errors: [{ messageId: 'useExplicitReturn' }],

      output: dedent`
        const obj = {
          UDimTemporary11111111111: (value: UDim, rem: number): UDim =>
            { return new UDim(value.Scale, value.Offset * rem) },
        };
      `,
    },

    {
      code: dedent`
        const isVariableDeclaration = (node: TSESTree.Node | null | undefined): node is TSESTree.VariableDeclaration =>
          node?.type === AST_NODE_TYPES.VariableDeclaration;
      `,

      errors: [{ messageId: 'useExplicitReturn' }],

      output: dedent`
        const isVariableDeclaration = (node: TSESTree.Node | null | undefined): node is TSESTree.VariableDeclaration =>
          { return node?.type === AST_NODE_TYPES.VariableDeclaration };
      `,
    },

    {
      code: dedent`
        const returnValues = blockBody
          .filter((node): node is TSESTree.ReturnStatement => node.type === AST_NODE_TYPES.ReturnStatement)
          .map((node) => node.argument)
          .filter(Boolean);
      `,

      errors: [{ messageId: 'useExplicitReturn' }],

      output: dedent`
        const returnValues = blockBody
          .filter((node): node is TSESTree.ReturnStatement => { return node.type === AST_NODE_TYPES.ReturnStatement })
          .map((node) => node.argument)
          .filter(Boolean);
      `,
    },

    {
      code: dedent`
        const delay = () =>
          new Promise((resolve) => {
            setTimeout(resolve, 1000)
          })
      `,

      errors: [{ messageId: 'useExplicitReturn' }],

      output: dedent`
        const delay = () =>
          { return new Promise((resolve) => {
            setTimeout(resolve, 1000)
          }) }
      `,
    },

    {
      code: dedent`
        const foo = () => {
          return 'foo'
        }
      `,

      errors: [{ messageId: 'useImplicitReturn' }],

      output: dedent`
        const foo = () => 
          'foo'\n
      `,
    },

    {
      code: dedent`
        Array.from({ length: 10 }).map((_, i) => {
          return i + 1
        })
      `,

      errors: [{ messageId: 'useImplicitReturn' }],

      output: dedent`
        Array.from({ length: 10 }).map((_, i) => 
          i + 1
        )
      `,
    },

    {
      code: dedent`
        const obj = () => {
          return { name: '' }
        }
      `,

      errors: [{ messageId: 'useImplicitReturn' }],

      output: dedent`
        const obj = () => 
          ({ name: '' })\n
      `,
    },

    {
      code: dedent`
        const data = () => ({
          name: ''
        })
      `,

      errors: [{ messageId: 'useExplicitReturn' }],

      output: dedent`
        const data = () => { return {
          name: ''
        } }
      `,
    },

    {
      code: 'export const defineConfig = <T extends Linter.Config>(config: T) => config',
      errors: [{ messageId: 'useExplicitReturn' }],
      output: 'export const defineConfig = <T extends Linter.Config>(config: T) => { return config }',
    },

    {
      code: 'const Div = () => <><div /></>',
      errors: [{ messageId: 'useExplicitReturn' }],
      options: [{ jsxAlwaysUseExplicitReturn: true }],
      output: 'const Div = () => { return <><div /></> }',
    },

    {
      code: 'export const Div = () => <><div /></>',
      errors: [{ messageId: 'useExplicitReturn' }],
      options: [{ namedExportsAlwaysUseExplicitReturn: true }],
      output: 'export const Div = () => { return <><div /></> }',
    },

    {
      code: dedent`
        const FC = () =>
          <Foo
          // d=""
          z
          // test={{}}
          data-ignore=""
          bar={[]}
        />
      `,

      errors: [{ messageId: 'useExplicitReturn' }],

      output: dedent`
        const FC = () =>
          { return <Foo
          // d=""
          z
          // test={{}}
          data-ignore=""
          bar={[]}
        /> }
      `,
    },

    {
      code: dedent`
        export const createRule = ESLintUtils.RuleCreator(
          (rule) => \`https://github.com/u3u/eslint-plugin-arrow-return-style/tree/v\${version}/docs/rules/\${rule}.md\`
        )
      `,

      errors: [{ messageId: 'useExplicitReturn' }],

      output: dedent`
        export const createRule = ESLintUtils.RuleCreator(
          (rule) => { return \`https://github.com/u3u/eslint-plugin-arrow-return-style/tree/v\${version}/docs/rules/\${rule}.md\` }
        )
      `,
    },

    {
      code: 'const render = () => (<div />)',
      errors: [{ messageId: 'useExplicitReturn' }],
      options: [{ jsxAlwaysUseExplicitReturn: true }],
      output: 'const render = () => { return <div /> }',
    },

    {
      code: dedent`
        const fn = () =>
          /* block comment */
          1
      `,

      errors: [{ messageId: 'useExplicitReturn' }],

      output: dedent`
        const fn = () => {
          /* block comment */
          return 1
        }
      `,
    },

    {
      code: dedent`
        const test = () =>
          // line comment
          ({ name: 'test' })
      `,

      errors: [{ messageId: 'useExplicitReturn' }],

      output: dedent`
        const test = () => {
          // line comment
          return { name: 'test' }
        }
      `,
    },
  ],

  valid: [
    'const t = () => Date.now()',
    'const fn = () => { return }',

    'Array.from({ length: 10 }).map((_, i) => i + 1)',

    {
      code: 'const Div = () => <><div /></>',
      options: [{ jsxAlwaysUseExplicitReturn: false }],
    },

    dedent`
      const bar = () => {
        // line comment
        return 'bar'
      }
    `,

    dedent`
      const fn = async () => {
        await delay(300)
        return 'fn'
      }
    `,

    dedent`
      export const getUser = async () => {
        return { name: 'admin' }
      }
    `,

    {
      code: "export const getUser = async () => ({ name: 'admin' })",
      options: [{ namedExportsAlwaysUseExplicitReturn: false }],
    },

    dedent`
      const isMaxLen = (node = arrowRoot) => {
        return node.loc.end.column - node.loc.start.column >= maxLen;
      };
    `,

    dedent`
      const isVariableDeclaration = (
        node: TSESTree.Node | null | undefined,
      ): node is TSESTree.VariableDeclaration => {
        return node?.type === AST_NODE_TYPES.VariableDeclaration;
      };
    `,

    dedent`
      const obj = {
        temporary: (v: UDim, rem = 0) => new UDim(v.Scale, v.Offset * rem),
      };
    `,
  ],
});
