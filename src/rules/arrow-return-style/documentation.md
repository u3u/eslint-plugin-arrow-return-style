# Enforce consistent arrow function return style based on length, multiline expressions, JSX usage, and export context

🔧 This rule is automatically fixable by the
[`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

🔧 This rule is automatically fixable by the
[`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

## Rule details

Enforces consistent return style for arrow functions based on various factors
like line length, multiline expressions, JSX usage, and export context. This
rule helps maintain readable and consistent arrow function syntax across your
codebase.

The rule automatically switches between implicit and explicit returns based on:

1. **Line length** - Long expressions use explicit returns for readability
2. **Multiline expressions** - Complex expressions use explicit returns with
   proper formatting
3. **JSX elements** - Optional explicit returns for JSX components
4. **Named exports** - Consistent explicit returns for exported functions
5. **Comments** - Proper comment placement with explicit returns

## Examples

### Incorrect

```js
// Too long for implicit return (exceeds maxLen)
const longExpression = () => someVeryLongFunctionName() + anotherLongFunction() + moreCode();

// Multiline should use explicit return
const multiline = () => {
  someValue +
  anotherValue
};

// Named export should use explicit return (by default)
export const getUser = () => ({ name: "admin" });

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
  return someValue +
    anotherValue;
};

// Named export with explicit return
export const getUser = () => {
  return { name: "admin" };
};

// Short expressions can use implicit return
const short = () => value;

// Comments properly placed with explicit return
const commented = () => {
  /* comment */
  return value;
};
```

## Options

This rule accepts an options object with the following properties:

### `maxLen`

**Type**: `number`  
**Default**: `80`

Maximum line length for implicit returns. Arrow functions exceeding this length
will be forced to use explicit return syntax for better readability.

```js
// With maxLen: 50
const short = () => value; // ✅ Implicit return (under limit)
const long = () => { // ✅ Explicit return (over limit)
  return someVeryLongFunctionNameThatExceedsTheLimit();
};
```

### `jsxAlwaysUseExplicitReturn`

**Type**: `boolean`  
**Default**: `false`

When `true`, JSX elements and fragments always use explicit return syntax, even
for simple cases.

```jsx
// With jsxAlwaysUseExplicitReturn: true
const Component1 = () => <div>Hello</div>; // ❌ Should use explicit return
const Component2 = () => { // ✅ Explicit return required
  return <div>Hello</div>;
};

// With jsxAlwaysUseExplicitReturn: false (default)
const Component3 = () => <div>Hello</div>; // ✅ Implicit return allowed
```

### `namedExportsAlwaysUseExplicitReturn`

**Type**: `boolean`  
**Default**: `true`

Forces named exported arrow functions to use explicit return syntax for
consistency with regular function declarations and easier future expansion.

```js
// With namedExportsAlwaysUseExplicitReturn: true (default)
export const getUser = () => ({ name: "admin" }); // ❌ Should use explicit return
export const getUserCorrect = () => { // ✅ Explicit return required
  return { name: "admin" };
};

// With namedExportsAlwaysUseExplicitReturn: false
export const getProfile = () => ({ name: "admin" }); // ✅ Implicit return allowed
```
