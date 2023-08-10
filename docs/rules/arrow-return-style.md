# Enforce arrow function return style (`arrow-return-style/arrow-return-style`)

⚠️ This rule _warns_ in the ✅ `recommended` config.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Fail

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

## Pass

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
