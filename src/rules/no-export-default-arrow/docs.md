# Disallow export default anonymous arrow function<br/>_**Automatically fix using the current file name.**_ (`arrow-return-style/no-export-default-arrow`)

⚠️ This rule _warns_ in the ✅ `recommended` config.

🔧 This rule is automatically fixable by the
[`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

If the default export is an anonymous arrow function, it will automatically be
converted to a named function using the current file name for exporting.

**File Name: `use-mouse.tsx`**

```ts
// eslint-disable-next-line arrow-return-style/no-export-default-arrow
function noExportDefaultArrow () {
  // ...
}

// ↓↓↓↓↓↓↓↓↓↓

function useMouse () {
  // ...
}

export default useMouse;

export default noExportDefaultArrow
```
