# eslint-plugin-arrow-return-style

> Enforce arrow function return style

[![npm version](https://badgen.net/npm/v/eslint-plugin-arrow-return-style)](https://npm.im/eslint-plugin-arrow-return-style) [![npm downloads](https://badgen.net/npm/dm/eslint-plugin-arrow-return-style)](https://npm.im/eslint-plugin-arrow-return-style) [![codecov](https://codecov.io/gh/u3u/eslint-plugin-arrow-return-style/branch/main/graph/badge.svg)](https://codecov.io/gh/u3u/eslint-plugin-arrow-return-style)

## Features

> This rule serves as an alternative to the [`arrow-body-style`](https://eslint.org/docs/latest/rules/arrow-body-style#as-needed) with `as-needed` options, used to improve the style of arrow function return values.

- When arrow function expressions are multiline or exceed a certain length, explicit return should be enforced to improve readability and extensibility.
- When an arrow function has only one return value (and does not contain any comments), implicit return should be used to simplify the code and improve readability.
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

## Options

### `maxLen`

Type: `number`\
Default: `80`

If the arrow function expression exceeds `maxLen` characters, it is forced to use explicit return.

## Rules

<!-- prettier-ignore-start -->
<!-- begin auto-generated rules list -->

⚠️ Configurations set to warn in.\
✅ Set in the `recommended` configuration.\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                                                   | Description                         | ⚠️ | 🔧 |
| :----------------------------------------------------- | :---------------------------------- | :- | :- |
| [arrow-return-style](docs/rules/arrow-return-style.md) | Enforce arrow function return style | ✅  | 🔧 |

<!-- end auto-generated rules list -->
<!-- prettier-ignore-end -->

## License

[MIT](./LICENSE) License © 2023 [u3u](https://github.com/u3u)
