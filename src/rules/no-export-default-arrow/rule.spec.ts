import { type InvalidTestCase, unindent, type ValidTestCase } from "eslint-vitest-rule-tester";

import { run } from "../test";
import { noExportDefaultArrowRule, RULE_NAME } from "./rule";

const valid: Array<ValidTestCase> = [
	unindent`
      const foo = () => {
        return 'foo'
      }

      export default foo
    `,

	"const now = () => Date.now()",
	"export const useQuery = () => {}",
];

const invalid: Array<InvalidTestCase> = [
	{
		code: unindent`
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
		output: unindent`
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
		code: unindent`
			export default () => {}

			export const foo = () => 'foo'
		`,
		errors: [{ messageId: "disallowExportDefaultArrow" }],
		filename: "use-mouse.tsx",
		output: unindent`
			const useMouse = () => {}

			export const foo = () => 'foo'

			export default useMouse
		`,
	},

	{
		code: unindent`
			export default () => 1

			// line comment
		`,
		errors: [{ messageId: "disallowExportDefaultArrow" }],
		filename: "just_for_fun.js",
		output: unindent`
			const justForFun = () => 1

			// line comment

			export default justForFun
		`,
	},

	{
		code: unindent`
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
		output: unindent`
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
		output: unindent`
			const Page = () => <></>

			export default Page
		`,
	},
];

run({
	invalid,
	name: RULE_NAME,
	rule: noExportDefaultArrowRule,
	valid,
});
