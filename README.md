# eslint-plugin-arrow-return-style

> Enforce arrow function return style and automatically fix it

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![codecov][codecov-src]][codecov-href]
[![License][license-src]][license-href]

## Features

> This rule serves as an alternative to the [`arrow-body-style`](https://eslint.org/docs/latest/rules/arrow-body-style#as-needed) with `as-needed` options, used to improve the style of arrow function return statement.

- When arrow function expressions are multiline or exceed a certain length, explicit return should be enforced to improve readability and extensibility.
- When an arrow function has only one return statement (and does not contain any comments), implicit return should be used to simplify the code and improve readability.
- When using arrow functions as named exports, explicit return should always be used to maintain consistency with regular functions.
- When using arrow functions as React components, always use explicit return to facilitate the addition of `props` and `hooks` in the future.

## Install

```sh
pnpm add eslint-plugin-arrow-return-style -D
```

## Usage

```js
/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['plugin:arrow-return-style/recommended'],
};
```

## Examples

### Fail

```tsx
/* eslint-disable arrow-return-style/arrow-return-style */

const delay = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });

const foo = () => {
  return 'foo';
};

Array.from({ length: 10 }).map((_, i) => {
  return i + 1;
});

const obj = () => {
  return { name: '' };
};

const data = () => ({
  name: '',
});

export const defineConfig = <T extends Linter.Config>(config: T) => config;

const fn = () => /* block comment */ 1;

const Div = () => (
  <>
    <div />
  </>
);
```

### Pass

```tsx
const delay = () => {
  return new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });
};

const foo = () => 'foo';

const obj = () => ({ name: '' });

Array.from({ length: 10 }).map((_, i) => i + 1);

const data = () => {
  return {
    name: '',
  };
};

export const defineConfig = <T extends Linter.Config>(config: T) => {
  return config;
};

const fn = () => {
  /* block comment */
  return 1;
};

const Div = () => {
  return (
    <>
      <div />
    </>
  );
};
```

## Options

### `maxLen`

Type: `number`\
Default: `80`

If the arrow function expression exceeds `maxLen` characters, it is forced to use explicit return.

### `jsxAlwaysUseExplicitReturn`

Type: `boolean`\
Default: `false`

If set `true`, always use explicit return when return value is `JSXElement` or `JSXFragment`.

## Rules

<!-- prettier-ignore-start -->
<!-- begin auto-generated rules list -->

⚠️ Configurations set to warn in.\
✅ Set in the `recommended` configuration.\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                                                             | Description                                                                                               | ⚠️ | 🔧 |
| :--------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- | :- | :- |
| [arrow-return-style](docs/rules/arrow-return-style.md)           | Enforce arrow function return style                                                                       | ✅  | 🔧 |
| [no-export-default-arrow](docs/rules/no-export-default-arrow.md) | Disallow export default anonymous arrow function<br/>_**Automatically fix using the current file name.**_ | ✅  | 🔧 |

<!-- end auto-generated rules list -->
<!-- prettier-ignore-end -->

## License

[MIT](./LICENSE) License © 2023 [u3u](https://github.com/u3u)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/eslint-plugin-arrow-return-style
[npm-version-href]: https://npmjs.com/package/eslint-plugin-arrow-return-style
[npm-downloads-src]: https://img.shields.io/npm/dm/eslint-plugin-arrow-return-style
[npm-downloads-href]: https://npmjs.com/package/eslint-plugin-arrow-return-style
[codecov-src]: https://codecov.io/gh/u3u/eslint-plugin-arrow-return-style/graph/badge.svg
[codecov-href]: https://codecov.io/gh/u3u/eslint-plugin-arrow-return-style
[license-src]: https://img.shields.io/github/license/u3u/eslint-plugin-arrow-return-style.svg
[license-href]: ./LICENSE
