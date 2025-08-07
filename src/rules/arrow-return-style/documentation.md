# Enforce arrow function return style (`arrow-return-style/arrow-return-style`)

⚠️ This rule _warns_ in the ✅ `recommended` config.

🔧 This rule is automatically fixable by the
[`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Fail

```tsx
/* eslint-disable arrow-return-style/arrow-return-style */

function delay () {
  return new Promise((resolve) => {
    setTimeout(resolve, 1000);
  })
}

function foo () {
  return "foo";
}

Array.from({ length: 10 }).map((_, index) =>
  index + 1
);

export function defineConfig <T extends Linter.Config>(config: T) { return config }

function data () {
  return {
  name: "",
}
}

function Div () {
  return <>
    <div />
  </>
}

function func () { /* block comment */ return 1
}

function object () {
  return { name: "" };
}
```

## Pass

```tsx
function delay () {
  return new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });
}

const foo = () => "foo";

const object = () => ({ name: "" });

Array.from({ length: 10 }).map((_, index) => index + 1);

export function defineConfig <T extends Linter.Config>(config: T) {
  return config;
}

function data () {
  return {
    name: "",
  };
}

function Div () {
  return (
    <>
      <div />
    </>
  );
}

function func () {
  /* block comment */
  return 1;
}
```

## Options

### `maxLen`

Type: `number`\
Default: `80`

If the arrow function expression exceeds `maxLen` characters, it is forced to
use explicit return.

### `jsxAlwaysUseExplicitReturn`

Type: `boolean`\
Default: `false`

If set `true`, always use explicit return when return value is `JSXElement` or
`JSXFragment`.

### `namedExportsAlwaysUseExplicitReturn`

Type: `boolean`\
Default: `true`

By default, named exported arrow functions will always use explicit return to
maintain consistency with regular functions because it is more intuitive and
unified, and convenient for expansion.

See [#57](https://github.com/u3u/eslint-plugin-arrow-return-style/issues/57)
