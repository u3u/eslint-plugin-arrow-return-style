# Disallow anonymous arrow functions as export default declarations

🔧 This rule is automatically fixable by the
[`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

💭 This rule requires
[type information](https://typescript-eslint.io/linting/typed-linting).

<!-- end auto-generated rule header -->

## Rule details

Anonymous arrow functions as default exports make debugging and profiling
difficult since they appear as unnamed functions in stack traces and dev tools.
This rule enforces converting them to named constants, improving code clarity
and debugging experience.

The rule automatically fixes violations by:

1. Creating a named constant using the current filename
2. Moving the export default declaration to a separate line
3. Using camelCase for regular functions and PascalCase for JSX components

## Examples

### Incorrect

```js
// File: use-mouse.tsx
export default () => {
	const [position] = useState({ x: 0, y: 0 });
	return position;
}; // ❌ Anonymous arrow function export
```

```jsx
// File: layout.tsx
export default () => <div>Layout</div>; // ❌ Anonymous JSX component export
```

### Correct

```js
// File: use-mouse.tsx
const useMouse = () => {
	const [position] = useState({ x: 0, y: 0 });
	return position;
};

export default useMouse; // ✅ Named function export
```

```jsx
// File: layout.tsx
const Layout = () => <div>Layout</div>;

export default Layout; // ✅ Named JSX component export
```

## Naming Convention

The rule automatically generates function names from the filename:

- **Regular functions**: camelCase (e.g., `use-mouse.tsx` → `useMouse`)
- **JSX components**: PascalCase (e.g., `layout.tsx` → `Layout`)

JSX components are detected when the arrow function returns JSX elements or
fragments.
