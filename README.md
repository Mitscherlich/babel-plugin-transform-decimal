# babel-plugin-transform-decimal

> NOTICE: This will not work in many cases, so please use bignumber.js or decimal.js directly only if you know, that the code works only with BigDecimals. Since [proposal decimal](https://github.com/tc39/proposal-decimal) is still in stage-1, it might changed a lot and this transformer many take this breaking changes in the feature.

A plugin for babel to transform `x * y` into something like `JSBD.multiply(x, y)` to support decimals.

## Example

Input using native `BigDecimal`s:

```js
const a = BigDecimal(0.1);
const b = 0.2m;

a + b;
a - b;
a * b;
a / b;
a % b;
a ** b;

a === b;
a < b;
a <= b;
a > b;
a >= b;

a.toString();
```

Compiled output using [`JSBD`][jsbd-repo]:

```js
const a = JSBD.BigDecimal(0.1);
const b = JSBD.BigDecimal(0.2);
JSBD.add(a, b);
JSBD.subtract(a, b);
JSBD.multiply(a, b);
JSBD.divide(a, b);
JSBD.remainder(a, b);
JSBD.pow(a, b);
JSBD.equal(a, b);
JSBD.lessThan(a, b);
JSBD.lessThanOrEqual(a, b);
JSBD.greaterThan(a, b);
JSBD.greaterThanOrEqual(a, b);
a.toString();
```

## Playground

1. Open https://babeljs.io/en/repl
2. Turn off all presets.
3. "Add plugin" @babel/babel-plugin-syntax-decimal
4. "Add plugin" babel-plugin-transform-decimal

> ¡ It is buggy !

Or you can try out on my fork version of [AST explorer](https://mitscherlich.github.io/babel-plugin-transform-decimal/).

## TODO(s)

- [x] support `BigDecimal.round(1m)`;
- [ ] support `Number(0.1m)`;
- [ ] support shift operators `<<` and `>>`;
- [ ] support bitwise operators like `&` / `|` / `^`;

## License

Published under [ISC License](LICENSE).

[jsbd-repo]: https://github.com/yukinotech/JSBD
