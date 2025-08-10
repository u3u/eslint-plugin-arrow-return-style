import { type InvalidTestCase, unindent, type ValidTestCase } from "eslint-vitest-rule-tester";

import { run } from "../test";
import { arrowReturnStyleRule, RULE_NAME } from "./rule";

const implicitMessageId = "use-implicit-return";
const explicitMessageId = "use-explicit-return";
const complexExplicitMessageId = "use-explicit-return-complex";

const complexExplicitOption = "complex-explicit";

const valid: Array<ValidTestCase> = [
	"const t = () => Date.now()",
	"const fn = () => { return }",

	"Array.from({ length: 10 }).map((_, i) => i + 1)",

	{
		code: "const Div = () => <><div /></>",
		options: [{ jsxAlwaysUseExplicitReturn: false }],
	},

	unindent`
      const bar = () => {
        // line comment
        return 'bar'
      }
    `,

	unindent`
      const fn = async () => {
        await delay(300)
        return 'fn'
      }
    `,

	unindent`
      export const getUser = async () => {
        return { name: 'admin' }
      }
    `,

	{
		code: "export const getUser = async () => ({ name: 'admin' })",
		options: [{ namedExportsAlwaysUseExplicitReturn: false }],
	},

	unindent`
      const isMaxLen = (node = arrowRoot) => {
        return node.loc.end.column - node.loc.start.column >= maxLen;
      };
    `,

	unindent`
      const isVariableDeclaration = (
        node: TSESTree.Node | null | undefined,
      ): node is TSESTree.VariableDeclaration => {
        return node?.type === AST_NODE_TYPES.VariableDeclaration;
      };
    `,

	unindent`
      const obj = {
        temporary: (v: UDim, rem = 0) => new UDim(v.Scale, v.Offset * rem),
      };
    `,

	unindent`
		if (enableGitignore) {
			if (typeof enableGitignore !== "boolean") {
				configs.push(
					interopDefault(import("eslint-config-flat-gitignore")).then((resolved) => {
						return [resolved(enableGitignore)];
					}),
				);
			}
		}
	`,

	"const 测试函数 = () => '短字符串'",
	"const emojiFunc = () => '🚀'",
	"const exactly80chars = () => 'this string makes the line exactly eighty chars:)'",

	{
		code: "const prettierMakesShort = () => ({ prop1: 'value', prop2: 'another' })",
		options: [
			{
				maxLen: 60,
				usePrettier: true,
			},
		],
	},

	{
		code: "const simpleObj = () => ({ player })",
		options: [{ objectReturnStyle: "off" }],
	},
	{
		code: "const simpleObj2 = () => ({ player })",
		options: [{ objectReturnStyle: complexExplicitOption }],
	},
	{
		code: "const twoProps = () => ({ player, id })",
		options: [{ maxObjectProperties: 2, objectReturnStyle: complexExplicitOption }],
	},
	{
		code: "const literalValues = () => ({ name: 'test', id: 1 })",
		options: [{ objectReturnStyle: complexExplicitOption }],
	},
	{
		code: "const simpleArray = () => ([1, 2, 3])",
		options: [{ objectReturnStyle: complexExplicitOption }],
	},
	{
		code: "const identifierArray = () => ([a, b, c])",
		options: [{ objectReturnStyle: complexExplicitOption }],
	},
	{
		code: "const manyElements = () => ([1, 2, 3, 4, 5, 6, 7])",
		options: [{ maxObjectProperties: 2, objectReturnStyle: complexExplicitOption }],
	},
	{
		code: "const manyIdentifiers = () => ([a, b, c, d, e, f])",
		options: [{ maxObjectProperties: 2, objectReturnStyle: complexExplicitOption }],
	},
	{
		code: "const singleSpread = () => ({ ...state })",
		options: [{ objectReturnStyle: complexExplicitOption }],
	},
	{
		code: "const singleArraySpread = () => ([...items])",
		options: [{ objectReturnStyle: complexExplicitOption }],
	},
	{
		code: "const singleComputedKey = () => ({ [key]: value })",
		options: [{ objectReturnStyle: complexExplicitOption }],
	},
	{
		code: "const singleFunctionCall = () => ({ name: getValue() })",
		options: [{ objectReturnStyle: complexExplicitOption }],
	},
];

const invalid: Array<InvalidTestCase> = [
	{
		code: unindent`
			const UDimTemporary = (value: UDim, rem: number): UDim => new UDim(value.Scale, value.Offset * rem);
		`,
		errors: [{ messageId: explicitMessageId }],
		output: unindent`
			const UDimTemporary = (value: UDim, rem: number): UDim => {
				return new UDim(value.Scale, value.Offset * rem);
			}
		`,
	},

	{
		code: unindent`
			const obj = {
			  UDimTemporary11111111111: (value: UDim, rem: number): UDim =>
			    new UDim(value.Scale, value.Offset * rem),
			};
		`,
		errors: [{ messageId: explicitMessageId }],
		output: unindent`
			const obj = {
			  UDimTemporary11111111111: (value: UDim, rem: number): UDim => {
			    return new UDim(value.Scale, value.Offset * rem);
			  }
			};
		`,
	},

	{
		code: unindent`
			const isVariableDeclaration = (node: TSESTree.Node | null | undefined): node is TSESTree.VariableDeclaration =>
			  node?.type === AST_NODE_TYPES.VariableDeclaration;
		`,
		errors: [{ messageId: explicitMessageId }],
		output: unindent`
			const isVariableDeclaration = (node: TSESTree.Node | null | undefined): node is TSESTree.VariableDeclaration => {
			  return node?.type === AST_NODE_TYPES.VariableDeclaration;
			}
		`,
	},

	{
		code: unindent`
			const returnValues = blockBody
			  .filter((node): node is TSESTree.ReturnStatement => node.type === AST_NODE_TYPES.ReturnStatement)
			  .map((node) => node.argument)
			  .filter(Boolean);
		`,
		errors: [{ messageId: explicitMessageId }],
		output: unindent`
			const returnValues = blockBody
			  .filter((node): node is TSESTree.ReturnStatement => {
			    return node.type === AST_NODE_TYPES.ReturnStatement;
			  })
			  .map((node) => node.argument)
			  .filter(Boolean);
		`,
	},

	{
		code: unindent`
			const delay = () =>
			  new Promise((resolve) => {
			    setTimeout(resolve, 1000)
			  })
		`,
		errors: [{ messageId: explicitMessageId }],
		output: unindent`
			const delay = () => {
			  return new Promise((resolve) => {
			    setTimeout(resolve, 1000)
			  });
			}
		`,
	},

	{
		code: unindent`
			const foo = () => {
			  return 'foo'
			}
		`,
		errors: [{ messageId: implicitMessageId }],
		output: unindent`
			const foo = () => 'foo'
		`,
	},

	{
		code: unindent`
			Array.from({ length: 10 }).map((_, i) => {
			  return i + 1
			})
		`,
		errors: [{ messageId: implicitMessageId }],
		output: unindent`
			Array.from({ length: 10 }).map((_, i) => i + 1)
		`,
	},

	{
		code: unindent`
			const obj = () => {
			  return { name: '' }
			}
		`,
		errors: [{ messageId: implicitMessageId }],
		output: unindent`
			const obj = () => ({ name: '' })
		`,
	},

	{
		code: "export const defineConfig = <T extends Linter.Config>(config: T) => config",
		errors: [{ messageId: explicitMessageId }],
		output: unindent`
			export const defineConfig = <T extends Linter.Config>(config: T) => {
				return config;
			}
		`,
	},

	{
		code: "const Div = () => <><div /></>",
		errors: [{ messageId: explicitMessageId }],
		options: [{ jsxAlwaysUseExplicitReturn: true }],
		output: unindent`
			const Div = () => {
				return <><div /></>;
			}
		`,
	},

	{
		code: "export const Div = () => <><div /></>",
		errors: [{ messageId: explicitMessageId }],
		options: [{ namedExportsAlwaysUseExplicitReturn: true }],
		output: unindent`
			export const Div = () => {
				return <><div /></>;
			}
		`,
	},

	{
		code: unindent`
			const FC = () =>
			  <Foo
			  // d=""
			  z
			  // test={{}}
			  data-ignore=""
			  bar={[]}
			/>
		`,
		errors: [{ messageId: explicitMessageId }],
		output: unindent`
			const FC = () => {
			  return <Foo
			    // d=""
			    z
			    // test={{}}
			    data-ignore=""
			    bar={[]}
			  />;
			}
		`,
	},

	{
		code: unindent`
			export const createRule = ESLintUtils.RuleCreator(
			  (rule) => \`https://github.com/u3u/eslint-plugin-arrow-return-style/tree/v\${version}/docs/rules/\${rule}.md\`
			)
		`,
		errors: [{ messageId: explicitMessageId }],
		output: unindent`
			export const createRule = ESLintUtils.RuleCreator(
			  (rule) => {
			    return \`https://github.com/u3u/eslint-plugin-arrow-return-style/tree/v\${version}/docs/rules/\${rule}.md\`;
			  }
			)
		`,
	},

	{
		code: "const render = () => (<div />)",
		errors: [{ messageId: explicitMessageId }],
		options: [{ jsxAlwaysUseExplicitReturn: true }],
		output: unindent`
			const render = () => {
				return <div />;
			}
		`,
	},

	{
		code: unindent`
			const fn = () =>
			  /* block comment */
			  1
		`,
		errors: [{ messageId: explicitMessageId }],
		output: unindent`
			const fn = () => {
			  /* block comment */
			  return 1
			}
		`,
	},

	{
		code: unindent`
			const test = () =>
			  // line comment
			  ({ name: 'test' })
		`,
		errors: [{ messageId: explicitMessageId }],
		output: unindent`
			const test = () => {
			  // line comment
			  return { name: 'test' }
			}
		`,
	},

	{
		code: unindent`
			if (enableGitignore) {
				if (typeof enableGitignore !== "boolean") {
					configs.push(
						interopDefault(import("eslint-config-flat-gitignore")).then((resolved) => [
							resolved(enableGitignore),
						]),
					);
				}
			}
		`,
		errors: [{ messageId: implicitMessageId }],
		output: unindent`
			if (enableGitignore) {
				if (typeof enableGitignore !== "boolean") {
					configs.push(
						interopDefault(import("eslint-config-flat-gitignore")).then((resolved) => {
							return [resolved(enableGitignore)];
						}),
					);
				}
			}
		`,
	},

	// Unicode test cases - invalid (should trigger rule fixes)
	{
		code: "const longUnicode测试 = () => '这是一个很长的中文字符串测试，应该触发显式返回，因为它超过了最大长度限制了吧应该是这样的，还要更长一些才能确保触发规则'",
		errors: [{ messageId: explicitMessageId }],
		output: unindent`
			const longUnicode测试 = () => {
				return '这是一个很长的中文字符串测试，应该触发显式返回，因为它超过了最大长度限制了吧应该是这样的，还要更长一些才能确保触发规则';
			}
		`,
	},
	{
		code: unindent`
			const emojiLongFunction = () => {
				return '🚀'.repeat(50);
			}
		`,
		errors: [{ messageId: implicitMessageId }],
		output: "const emojiLongFunction = () => '🚀'.repeat(50)",
	},
	{
		code: unindent`
			const unicodeBoundary = () => {
				return "测试".repeat(10);
			}
		`,
		errors: [{ messageId: implicitMessageId }],
		output: 'const unicodeBoundary = () => "测试".repeat(10)',
	},
	{
		code: unindent`
			const 한국어함수 = () => {
				return '안녕하세요 세계';
			}
		`,
		errors: [{ messageId: implicitMessageId }],
		output: "const 한국어함수 = () => '안녕하세요 세계'",
	},

	// Test case to expose length calculation inconsistency
	// Target the boundary between calculateImplicitLength vs isMaxLength vs line length
	// This creates a scenario where different calculation methods might disagree
	{
		code: "const inconsistencyTest = () => { return obj.prop + other.value; }",
		errors: [{ messageId: implicitMessageId }],
		options: [{ maxLen: 65 }],
		output: "const inconsistencyTest = () => obj.prop + other.value",
	},

	{
		code: "const exactly81chars = () => 'this string makes the line exactly eighty-one char'",
		errors: [{ messageId: explicitMessageId }],
		options: [{ maxLen: 80 }],
		output: unindent`
			const exactly81chars = () => {
				return 'this string makes the line exactly eighty-one char';
			}
		`,
	},

	{
		code: unindent`
			const prettierMakesShortEnough = () => {
				return {  prop1   :   'val',   prop2   :   'val2'  };
			}
		`,
		errors: [{ messageId: implicitMessageId }],
		options: [
			{
				maxLen: 60,
				usePrettier: true,
			},
		],
		output: "const prettierMakesShortEnough = () => ({  prop1   :   'val',   prop2   :   'val2'  })",
	},

	{
		code: "const simpleObj = () => ({ player })",
		errors: [{ messageId: complexExplicitMessageId }],
		options: [{ objectReturnStyle: "always-explicit" }],
		output: unindent`
			const simpleObj = () => {
				return { player };
			}
		`,
	},
	{
		code: "const singleProp = () => ({ id: 1 })",
		errors: [{ messageId: complexExplicitMessageId }],
		options: [{ objectReturnStyle: "always-explicit" }],
		output: unindent`
			const singleProp = () => {
				return { id: 1 };
			}
		`,
	},

	{
		code: "const closePlayerData = (state, player: string) => ({ ...state, [player]: undefined })",
		errors: [{ messageId: complexExplicitMessageId }],
		options: [{ objectReturnStyle: complexExplicitOption }],
		output: unindent`
			const closePlayerData = (state, player: string) => {
				return { ...state, [player]: undefined };
			}
		`,
	},
	{
		code: "const threeProps = () => ({ player, test, another })",
		errors: [{ messageId: complexExplicitMessageId }],
		options: [{ maxObjectProperties: 2, objectReturnStyle: complexExplicitOption }],
		output: unindent`
			const threeProps = () => {
				return { player, test, another };
			}
		`,
	},
	{
		code: "const multipleCallsInObject = () => ({ name: getValue(), id: getId() })",
		errors: [{ messageId: complexExplicitMessageId }],
		options: [{ objectReturnStyle: complexExplicitOption }],
		output: unindent`
			const multipleCallsInObject = () => {
				return { name: getValue(), id: getId() };
			}
		`,
	},
	{
		code: "const spreadPlusComputed = () => ({ ...state, [key]: value })",
		errors: [{ messageId: complexExplicitMessageId }],
		options: [{ objectReturnStyle: complexExplicitOption }],
		output: unindent`
			const spreadPlusComputed = () => {
				return { ...state, [key]: value };
			}
		`,
	},
	{
		code: "const computedPlusCall = () => ({ [key]: getValue() })",
		errors: [{ messageId: complexExplicitMessageId }],
		options: [{ objectReturnStyle: complexExplicitOption }],
		output: unindent`
			const computedPlusCall = () => {
				return { [key]: getValue() };
			}
		`,
	},

	{
		code: "const complexArray = () => ([...items, newItem])",
		errors: [{ messageId: complexExplicitMessageId }],
		options: [{ objectReturnStyle: complexExplicitOption }],
		output: unindent`
			const complexArray = () => {
				return [...items, newItem];
			}
		`,
	},
	{
		code: "const arrayWithCalls = () => ([getValue(), getId()])",
		errors: [{ messageId: complexExplicitMessageId }],
		options: [{ objectReturnStyle: complexExplicitOption }],
		output: unindent`
			const arrayWithCalls = () => {
				return [getValue(), getId()];
			}
		`,
	},
	{
		code: "const longArrayExceedsMaxLen = () => (['this', 'array', 'is', 'long'])",
		errors: [{ messageId: explicitMessageId }],
		options: [{ maxLen: 60, objectReturnStyle: complexExplicitOption }],
		output: unindent`
			const longArrayExceedsMaxLen = () => {
				return ['this', 'array', 'is', 'long'];
			}
		`,
	},
];

run({
	invalid,
	name: RULE_NAME,
	rule: arrowReturnStyleRule,
	valid,
});
