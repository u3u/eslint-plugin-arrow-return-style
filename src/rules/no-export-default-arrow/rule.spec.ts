import { RuleTester } from "@typescript-eslint/rule-tester";

import dedent from "dedent";
import { afterAll, describe, it } from "vitest";

import { noExportDefaultArrowRule, RULE_NAME } from "./no-export-default-arrow/rule";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
	parser: "@typescript-eslint/parser",

	parserOptions: {
		ecmaFeatures: { jsx: true },
	},
});

ruleTester.run(RULE_NAME, noExportDefaultArrowRule, {
	invalid: [
		{
			code: dedent`
        import { useState } from 'react'
      
        export default () => {
          const [, update] = useState({})

          const forceUpdate = () => {
            update({})
          }

          return forceUpdate
        }
      `,

			errors: [{ messageId: "disallowExportDefaultArrow" }],

			filename: "useForceUpdate.ts",

			output: dedent`
        import { useState } from 'react'
      
        const useForceUpdate = () => {
          const [, update] = useState({})

          const forceUpdate = () => {
            update({})
          }

          return forceUpdate
        }

        export default useForceUpdate
      `,
		},

		{
			code: dedent`
        export default () => {}

        export const foo = () => 'foo'
      `,

			errors: [{ messageId: "disallowExportDefaultArrow" }],

			filename: "use-mouse.tsx",

			output: dedent`
        const useMouse = () => {}

        export const foo = () => 'foo'

        export default useMouse
      `,
		},

		{
			code: dedent`
        export default () => 1

        // line comment

        /* block comment */
      `,

			errors: [{ messageId: "disallowExportDefaultArrow" }],

			filename: "just_for_fun.js",

			output: dedent`
        const justForFun = () => 1

        // line comment

        /* block comment */

        export default justForFun
      `,
		},

		{
			code: dedent`
        export default () => {
          return (
            <html>
              <head />
              <body></body>
            </html>
          )
        }
      `,

			errors: [{ messageId: "disallowExportDefaultArrow" }],

			filename: "layout.tsx",

			output: dedent`
        const Layout = () => {
          return (
            <html>
              <head />
              <body></body>
            </html>
          )
        }

        export default Layout
      `,
		},

		{
			code: "export default () => <></>",

			errors: [{ messageId: "disallowExportDefaultArrow" }],

			filename: "page.tsx",

			output: dedent`
        const Page = () => <></>

        export default Page
      `,
		},
	],

	valid: [
		dedent`
      const foo = () => {
        return 'foo'
      }

      export default foo
    `,

		"const now = () => Date.now()",
		"export const useQuery = () => {}",
	],
});
