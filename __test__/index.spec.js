// to run this test file use `npx jest` in the parent folder or `npm run test`
// to transform some-file.js use a command: `npx babel --plugins=module:./index.js some-file.js` from the parent folder

const babel = require('@babel/core');
const plugin = require('..');

it('it works with UpdateExpression', function () {
  const example = `
    const o = {};
    o.x = {};
    o.x.y = 1m;
    o.x.yz = 1m;
    const y = 'y';
    const z = 'z';
    const b = 1m;

    o.x.y += b;
    o.x['y'] += b;
    o.x[y] += b;
    o.x[y + z] += b;

    ++o.x.y;
    ++o.x['y'];
    ++o.x[y];
    ++o.x[y + z];

    o.x.y++;
    o.x['y']++;
    o.x[y]++;
    o.x[y + z]++;
  `;
  const { code } = babel.transform(example, { plugins: [plugin] });
  expect(code).toMatchSnapshot();
});

it('works when type of variable is changed', function () {
  const example = `
    let g1 = 1;
    g1 = 1m;
    if (g1 === 1m) {
      console.log(g1);
    }
  `;
  const { code } = babel.transform(example, { plugins: [plugin] });
  expect(code).toMatchSnapshot();
});

it('non-strict comparisions are not changed', function () {
  const example = `
    const g = .1m;
    if (g == 1) {
      console.log(g);
    }
    if (g != 1) {
      console.log(g);
    }
    if (g < 1) {
      console.log(g);
    }
    if (g > 1) {
      console.log(g);
    }
    if (g <= 1) {
      console.log(g);
    }
    if (g >= 1) {
      console.log(g);
    }
  `;
  const { code } = babel.transform(example, { plugins: [plugin] });
  expect(code).toMatchSnapshot();
});

it('BigDecimal.round(m, o) is replaced', function () {
  const example = `
    const g = 1m;
    BigDecimal.round(g, { roundingMode: 'half up' });
  `;
  const { code } = babel.transform(example, { plugins: [plugin] });
  expect(code).toMatchSnapshot();
});

it('works', function () {
  const example = `
    function f() {
      const x = 1m;
      return x + x;
    }
  `;
  const { code } = babel.transform(example, { plugins: [plugin] });
  expect(code).toMatchSnapshot();
});
