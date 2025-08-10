# eslint-plugin-arrow-return-style-x

> Enforce arrow function return style and automatically fix it

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]

## Attribution

This project is a fork of
[`eslint-plugin-arrow-return-style`](https://github.com/u3u/eslint-plugin-arrow-return-style)
by [u3u](https://github.com/u3u). The original work provides the foundation for
arrow function return style enforcement, and this fork extends it with
additional features and improvements.

## Features

This ESLint plugin provides intelligent arrow function return style enforcement,
serving as an enhanced alternative to
[`arrow-body-style`](https://eslint.org/docs/latest/rules/arrow-body-style#as-needed)
with smarter heuristics.

### Key Features

- **Context-aware decisions**: Considers line length, object complexity, JSX
  elements, and export context to determine the best return style
- **Handles complex cases**: Works with objects, arrays, multiline expressions,
  and named exports that other rules miss
- **Auto-fixes everything**: No manual cleanup needed - the plugin fixes code
  automatically
- **Consistent exports**: Forces explicit returns for named exports to match
  regular function style
- **Prettier compatible**: Zero conflicts with Prettier formatting - works
  seamlessly together

## Installation

```bash
# npm
npm install eslint-plugin-arrow-return-style-x --save-dev

# pnpm
pnpm add eslint-plugin-arrow-return-style-x -D

# yarn
yarn add eslint-plugin-arrow-return-style-x --dev
```

## Usage

### Flat Config (ESLint 9+)

```js
import arrowReturnStyle from "eslint-plugin-arrow-return-style-x";

export default [arrowReturnStyle.configs.recommended.rules];
```

### Legacy Config (.eslintrc)

```json
{
	"extends": ["plugin:arrow-return-style-x/recommended"]
}
```

## Configuration

### Basic Setup

```json
{
	"rules": {
		"arrow-return-style-x/arrow-return-style": [
			"error",
			{
				"maxLen": 80,
				"objectReturnStyle": "complex-explicit"
			}
		]
	}
}
```

Key options include `maxLen` (line length limit), `objectReturnStyle`
(object/array handling), JSX and named export controls, plus automatic Prettier
integration when available.

📖
**[See full configuration options →](src/rules/arrow-return-style/documentation.md)**

### Rules Overview

- **`arrow-return-style`**: Main rule with extensive configuration options
- **`no-export-default-arrow`**: Converts anonymous exports to named functions
  (no configuration needed)

## Quick Example

```js
// ❌ Before: Inconsistent arrow function styles
const longFunc = () =>
	someVeryLongFunctionCall() + anotherLongCall() + moreCode();
export const getUserBad = () => ({ name: "admin" });

const complexFunc = () => ({ ...state, [key]: value });

// ✅ After: Consistent, readable arrow functions
const longFunc2 = () => {
	return someVeryLongFunctionCall() + anotherLongCall() + moreCode();
};

export const getUserGood = () => {
	return { name: "admin" };
};

const complexFunc2 = () => {
	return { ...state, [key]: value };
};

const simple = () => ({ name: "test" }); // Simple cases stay implicit
```

📖 **[See more examples →](src/rules/arrow-return-style/documentation.md)**

## Rules Reference

<!-- begin auto-generated rules list -->

🔧 Automatically fixable by the
[`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).\
💭
Requires [type information](https://typescript-eslint.io/linting/typed-linting).

| Name                                                                          | Description                                                                                                          | 🔧  | 💭  |
| :---------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- | :-- | :-- |
| [arrow-return-style](src/rules/arrow-return-style/documentation.md)           | Enforce consistent arrow function return style based on length, multiline expressions, JSX usage, and export context | 🔧  |     |
| [no-export-default-arrow](src/rules/no-export-default-arrow/documentation.md) | Disallow anonymous arrow functions as export default declarations                                                    | 🔧  | 💭  |

<!-- end auto-generated rules list -->

## Contributing

Contributions are welcome!

## License

[MIT](./LICENSE) License © 2024
[Christopher Buss](https://github.com/christopher-buss)

Original work © 2023 [u3u](https://github.com/u3u)

<!-- Badges -->

[npm-version-src]:
	https://img.shields.io/npm/v/eslint-plugin-arrow-return-style-x
[npm-version-href]: https://npmjs.com/package/eslint-plugin-arrow-return-style-x
[npm-downloads-src]:
	https://img.shields.io/npm/dm/eslint-plugin-arrow-return-style-x
[npm-downloads-href]:
	https://npmjs.com/package/eslint-plugin-arrow-return-style-x
[license-src]:
	https://img.shields.io/github/license/christopher-buss/eslint-plugin-arrow-return-style-x.svg
[license-href]: ./LICENSE
