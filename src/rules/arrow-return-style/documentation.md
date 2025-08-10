# Enforce consistent arrow function return style based on length, multiline expressions, JSX usage, and export context

🔧 This rule is automatically fixable by the
[`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule details

Enforces consistent return style for arrow functions using context-aware
decisions that consider line length, object complexity, JSX elements, and export
context. This rule handles complex cases that other rules miss while maintaining
zero conflicts with Prettier formatting.

The rule automatically switches between implicit and explicit returns based on:

1. **Line length** - Long expressions use explicit returns for readability
2. **Multiline expressions** - Complex expressions use explicit returns with
   proper formatting
3. **Object/Array complexity** - Complex objects and arrays use explicit returns
4. **JSX elements** - Optional explicit returns for JSX components
5. **Named exports** - Forces explicit returns to maintain consistency with
   regular functions
6. **Comments** - Proper comment placement with explicit returns

## Examples

### Incorrect

```js
// Too long for implicit return (exceeds maxLen)
const longExpression = () =>
	someVeryLongFunctionName() + anotherLongFunction() + moreCode();

// Multiline should use explicit return
const multiline = () => {
	someValue + anotherValue;
};

// Named export should use explicit return (by default)
export const getUser = () => ({ name: "admin" });

// Complex objects should use explicit return
const complexObject = () => ({ ...state, [player]: undefined });
const manyProps = () => ({ email, id, name });

// Complex arrays should use explicit return
const complexArray = () => [...items, item];
const arrayCalls = () => [getValue(), getId()];

// Comments between arrow and body need explicit return
const commented = () => /* comment */ value;
```

### Correct

```js
// Long expressions use explicit return
const longExpression = () => {
	return someVeryLongFunctionName() + anotherLongFunction() + moreCode();
};

// Multiline with proper explicit return
const multiline = () => {
	return someValue + anotherValue;
};

// Named export with explicit return
export const getUser = () => {
	return { name: "admin" };
};

// Complex objects with explicit return
const complexObject = () => {
	return { ...state, [player]: undefined };
};

const manyProps = () => {
	return { email, id, name };
};

// Complex arrays with explicit return
const complexArray = () => {
	return [...items, item];
};

const arrayCalls = () => {
	return [getValue(), getId()];
};

// Simple objects/arrays can use implicit return
const simpleObject = () => ({ name: "test" });
const simpleArray = () => [1, 2, 3];

// Short expressions can use implicit return
const short = () => value;

// Comments properly placed with explicit return
const commented = () => {
	/* comment */
	return value;
};
```

## Options

<!-- begin auto-generated rule options list -->

| Name                                  | Description                                                                                                                      | Type    | Choices                                      |
| :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------- | :------ | :------------------------------------------- |
| `jsxAlwaysUseExplicitReturn`          | Always use explicit return for JSX elements                                                                                      | Boolean |                                              |
| `maxLen`                              | Maximum line length before requiring explicit return                                                                             | Number  |                                              |
| `maxObjectProperties`                 | Maximum number of object properties before requiring explicit return (only applies when objectReturnStyle is 'complex-explicit') | Number  |                                              |
| `namedExportsAlwaysUseExplicitReturn` | Always use explicit return for named exports                                                                                     | Boolean |                                              |
| `objectReturnStyle`                   | Control when object and array returns should use explicit syntax                                                                 | String  | `always-explicit`, `complex-explicit`, `off` |
| `usePrettier`                         | Use Prettier to determine actual formatted line length (auto-detects Prettier availability if not explicitly set)                | Boolean |                                              |

<!-- end auto-generated rule options list -->
