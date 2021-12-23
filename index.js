const syntaxDecimal = require('@babel/plugin-syntax-decimal').default;

// https://github.com/yukinotech/JSBD#usage
const binaryExpressionToFunction = new Map([
  ['+', 'add'],
  ['-', 'subtract'],
  ['*', 'multiply'],
  ['/', 'divide'],
  ['%', 'remainder'],
  ['**', 'pow'],
  ['===', 'equal'],
  ['!==', 'notEqual'],
  ['<', 'lessThan'],
  ['>', 'greaterThan'],
  ['<=', 'lessThanOrEqual'],
  ['>=', 'greaterThanOrEqual'],
  ['==', 'equal'],
  ['!=', 'notEqual'],
]);

// https://github.com/yukinotech/JSBD#usage
const unaryExpressionToFunction = new Map([
  /* TODO */
]);

// https://github.com/yukinotech/JSBD#usage
const updateExpressionToFunction = new Map([
  ['++', 'add'],
  ['--', 'subtract'],
]);

// https://github.com/yukinotech/JSBD#usage
const staticMethods = new Set(['round']);

module.exports = function (babel) {
  const t = babel.types;

  const visited = new Map();
  const canBeDecimal = function (path) {
    if (visited.has(path)) {
      return visited.get(path);
    }
    visited.set(path, maybeJSBD);
    const result = canBeDecimalInternal(path);
    if (result === maybeJSBD) {
      visited.delete(path);
    } else {
      visited.set(path, result);
    }
    return result;
  };
  const and = function (a, b) {
    if (a === maybeJSBD) {
      return b;
    }
    if (b === maybeJSBD) {
      return a;
    }
    if (a === JSBD && b === JSBD) {
      return JSBD;
    }
    return false;
  };
  const canBeDecimalInternal = function (path) {
    if (path.node.type === 'DecimalLiteral') {
      return JSBD;
    }
    if (path.node.type === 'NumericLiteral') {
      return false;
    }
    if (path.node.type === 'StringLiteral') {
      return false;
    }
    if (path.node.type === 'UnaryExpression') {
      if (path.node.operator === '+') {
        return false; // +0m is not allowed
      }
      return canBeDecimal(path.get('argument'));
    }
    if (path.node.type === 'BinaryExpression') {
      return and(canBeDecimal(path.get('left')), canBeDecimal(path.get('right')));
    }
    if (path.node.type === 'AssignmentExpression') {
      return and(canBeDecimal(path.get('left')), canBeDecimal(path.get('right')));
    }
    if (path.node.type === 'Identifier') {
      const binding = path.scope.getBinding(path.node.name);
      if (binding != null) {
        if (binding.path.node.type === 'VariableDeclarator') {
          const x = binding.path.get('init');
          if (x.node != null && canBeDecimal(x) === false) {
            return false;
          }
        }
        for (const path of binding.referencePaths) {
          // The next code causes infinite recursion, seems:
          // if (
          //   path.parentPath.node.type === 'BinaryExpression' &&
          //   binaryExpressionToFunction.has(path.parentPath.node.operator) &&
          //   canBeBigDecimal(path.parentPath) === false
          // ) {
          //   return false;
          // }
        }
      } else if (path.node.name === 'undefined') {
        return false;
      }
      if (binding != null && binding.constant) {
        const ifStatement = path.findParent((path) => path.isIfStatement());
        const variableName = path.node.name;
        if (ifStatement != null) {
          const tmp = ifStatement.get('test');
          if (tmp.node.operator === '&&') {
            const checkTypeOf = function (node) {
              if (node.type === 'BinaryExpression' && /===?/.test(node.operator)) {
                if (node.left.type === 'UnaryExpression' && node.left.operator === 'typeof') {
                  if (
                    node.left.argument.type === 'Identifier' &&
                    node.left.argument.name === variableName
                  ) {
                    if (node.right.type === 'StringLiteral' && node.right.value === 'number') {
                      return true;
                    }
                  }
                }
              }
              return false;
            };
            if (checkTypeOf(tmp.node.left)) {
              return false;
            }
            if (checkTypeOf(tmp.node.right)) {
              return false;
            }
          }
        }
      }
      return maybeJSBD;
    }
    if (path.node.type === 'ConditionalExpression') {
      return canBeDecimal(path.get('consequent')) !== false ||
        canBeDecimal(path.get('alternate')) !== false
        ? maybeJSBD
        : false;
    }
    if (path.node.type === 'FunctionExpression') {
      return false;
    }
    if (path.node.type === 'NewExpression') {
      return false;
    }
    if (path.node.type === 'NullLiteral') {
      return false;
    }
    if (path.node.type === 'LogicalExpression') {
      return false; // TODO
    }
    if (path.node.type === 'ObjectProperty') {
      return false; // TODO
    }
    if (path.node.type === 'CallExpression') {
      if (
        path.node.callee.type === 'MemberExpression' &&
        path.node.callee.object.type === 'Identifier' &&
        path.node.callee.object.name === 'Math'
      ) {
        return false;
      }
      if (path.node.callee.type === 'Identifier' && path.node.callee.name === 'Number') {
        return false;
      }
      if (path.node.callee.type === 'Identifier' && path.node.callee.name === 'BigDecimal') {
        return JSBD;
      }
      // if (
      //   path.node.callee.type === 'MemberExpression' &&
      //   path.node.callee.object.type === 'Identifier' &&
      //   path.node.callee.object.name === 'BigDecimal'
      // ) {
      //   return JSBD;
      // }
    }
    if (path.node.type === 'CallExpression') {
      if (path.node.callee.type === 'Identifier') {
        const binding = path.scope.getBinding(path.node.callee.name);
        if (binding != null) {
          if (binding.path.node.type === 'FunctionDeclaration') {
            const statements = binding.path.get('body').get('body');
            for (const statement of statements) {
              if (statement.type === 'ReturnStatement') {
                if (canBeDecimal(statement.get('argument')) === false) {
                  return false;
                }
              }
            }
          }
        }
      }
    }
    if (path.node.type === 'UpdateExpression') {
      return canBeDecimal(path.get('argument'));
    }

    return maybeJSBD;
  };

  const JSBD = 'JSBD';
  const maybeJSBD = 'maybeJSBD';
  const IMPORT_PATH = 'jsbd';

  const maybeJSBDCode = `
var maybeJSBD = {
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBD.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBD.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBD.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBD.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBD.remainder(a, b) : a % b;
  },
  pow: function pow(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBD.pow(a, b) : (typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b));
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBD.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBD.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessThanOrEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBD.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterThanOrEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBD.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBD.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBD.notEqual(a, b) : a !== b;
  },
};
  `;

  return {
    name: 'transform-bigdecimal',
    inherits: syntaxDecimal,
    visitor: {
      CallExpression: function (path) {
        if (path.node.callee.name === 'BigDecimal') {
          path.replaceWith(
            t.callExpression(
              t.memberExpression(t.identifier(JSBD), t.identifier('BigDecimal')),
              path.node.arguments
            )
          );
          this.shouldInjectHelperCode = true;
        }
        if (path.node.callee.type === 'MemberExpression') {
          if (path.node.callee.object.name === 'BigDecimal') {
            if (staticMethods.has(path.node.callee.property.name)) {
              path.replaceWith(
                t.callExpression(
                  t.memberExpression(
                    t.identifier(JSBD),
                    t.identifier(path.node.callee.property.name)
                  ),
                  path.node.arguments
                )
              );
              this.shouldInjectHelperCode = true;
            }
          }
        }
      },
      DecimalLiteral: function (path) {
        const value = path.node.value;
        if (isSafeDecimal(value)) {
          const number = Number(value); // TODO
          // 1m -> BigDecimal(1)
          path.replaceWith(
            t.callExpression(t.memberExpression(t.identifier(JSBD), t.identifier('BigDecimal')), [
              t.numericLiteral(number),
            ])
          );
        } else {
          // 0.99999999999999999m -> BigDecimal('0.99999999999999999')
          path.replaceWith(
            t.callExpression(t.memberExpression(t.identifier(JSBD), t.identifier('BigDecimal')), [
              t.stringLiteral(value),
            ])
          );
        }
        this.shouldInjectHelperCode = true;
      },
      BinaryExpression: function (path) {
        const JSBD = canBeDecimal(path);
        if (JSBD !== false) {
          const operator = path.node.operator;
          if (binaryExpressionToFunction.has(operator)) {
            const functionName = binaryExpressionToFunction.get(operator);
            // x * y -> JSBD.multiply(x, y)
            path.replaceWith(
              t.callExpression(t.memberExpression(t.identifier(JSBD), t.identifier(functionName)), [
                path.node.left,
                path.node.right,
              ])
            );
            this.shouldInjectHelperCode = true;
          }
        }
      },
      UnaryExpression: function (path) {
        const JSBD = canBeDecimal(path);
        if (JSBD !== false) {
          if (unaryExpressionToFunction.has(path.node.operator)) {
            const functionName = unaryExpressionToFunction.get(path.node.operator);
            // -x -> JSBD.unaryMinus(x)
            path.replaceWith(
              t.callExpression(t.memberExpression(t.identifier(JSBD), t.identifier(functionName)), [
                path.node.argument,
              ])
            );
            this.shouldInjectHelperCode = true;
          }
        }
      },
      UpdateExpression: function (path) {
        const JSBD = canBeDecimal(path);
        if (JSBD !== false) {
          const operator = path.node.operator;
          const prefix = path.node.prefix;
          if (updateExpressionToFunction.has(operator)) {
            const functionName = updateExpressionToFunction.get(operator);
            const one = t.callExpression(
              t.memberExpression(t.identifier(JSBD), t.identifier('BigDecimal')),
              [t.numericLiteral(1)]
            );
            const argument = path.node.argument;
            if (t.isMemberExpression(argument)) {
              if (prefix) {
                const x = path.scope.generateUidIdentifier('x');
                path.scope.push({ id: x });
                const y = path.scope.generateUidIdentifier('y');
                path.scope.push({ id: y });
                // ++object[property] -> (x = object, y = property, x[y] = x[y] + 1)
                path.replaceWith(
                  t.sequenceExpression([
                    t.assignmentExpression('=', x, argument.object),
                    t.assignmentExpression(
                      '=',
                      y,
                      argument.computed
                        ? argument.property
                        : t.StringLiteral(argument.property.name)
                    ),
                    t.assignmentExpression(
                      '=',
                      t.memberExpression(x, y, true),
                      t.callExpression(
                        t.memberExpression(t.identifier(JSBD), t.identifier(functionName)),
                        [t.memberExpression(x, y, true), one]
                      )
                    ),
                  ])
                );
              } else {
                const x = path.scope.generateUidIdentifier('x');
                path.scope.push({ id: x });
                const y = path.scope.generateUidIdentifier('y');
                path.scope.push({ id: y });
                const z = path.scope.generateUidIdentifier('z');
                path.scope.push({ id: z });
                // object[property]++ -> (x = object, y = property, z = x[y], x[y] = x[y] + 1, z)
                path.replaceWith(
                  t.sequenceExpression([
                    t.assignmentExpression('=', x, argument.object),
                    t.assignmentExpression(
                      '=',
                      y,
                      argument.computed
                        ? argument.property
                        : t.StringLiteral(argument.property.name)
                    ),
                    t.assignmentExpression('=', z, t.memberExpression(x, y, true)),
                    t.assignmentExpression(
                      '=',
                      t.memberExpression(x, y, true),
                      t.callExpression(
                        t.memberExpression(t.identifier(JSBD), t.identifier(functionName)),
                        [z, one]
                      )
                    ),
                    z,
                  ])
                );
              }
            } else if (prefix) {
              // ++argument -> (argument = argument + 1)
              path.replaceWith(
                t.assignmentExpression(
                  '=',
                  argument,
                  t.callExpression(
                    t.memberExpression(t.identifier(JSBD), t.identifier(functionName)),
                    [argument, one]
                  )
                )
              );
            } else {
              const x = path.scope.generateUidIdentifier('x');
              path.scope.push({ id: x });
              // argument++ -> (x = argument, argument = argument + 1, x)
              path.replaceWith(
                t.sequenceExpression([
                  t.assignmentExpression('=', x, argument),
                  t.assignmentExpression(
                    '=',
                    argument,
                    t.callExpression(
                      t.memberExpression(t.identifier(JSBD), t.identifier(functionName)),
                      [argument, one]
                    )
                  ),
                  x,
                ])
              );
            }
            this.shouldInjectHelperCode = true;
          }
        }
      },
      AssignmentExpression: function (path) {
        const D = canBeDecimal(path);
        if (D !== false) {
          const operator = path.node.operator;
          if (operator.endsWith('=')) {
            const functionName = binaryExpressionToFunction.get(operator.slice(0, -'='.length));
            if (functionName != null) {
              const left = path.node.left;
              const right = path.node.right;
              if (t.isMemberExpression(left)) {
                const x = path.scope.generateUidIdentifier('x');
                path.scope.push({ id: x });
                const y = path.scope.generateUidIdentifier('y');
                path.scope.push({ id: y });
                // object[property] += right -> (x = object, y = property, x[y] = x[y] + right)
                path.replaceWith(
                  t.sequenceExpression([
                    t.assignmentExpression('=', x, left.object),
                    t.assignmentExpression(
                      '=',
                      y,
                      left.computed ? left.property : t.StringLiteral(left.property.name)
                    ),
                    t.assignmentExpression(
                      '=',
                      t.memberExpression(x, y, true),
                      t.callExpression(
                        t.memberExpression(t.identifier(D), t.identifier(functionName)),
                        [t.memberExpression(x, y, true), right]
                      )
                    ),
                  ])
                );
              } else {
                // left += right -> (left = left + right)
                path.replaceWith(
                  t.assignmentExpression(
                    '=',
                    left,
                    t.callExpression(
                      t.memberExpression(t.identifier(D), t.identifier(functionName)),
                      [left, right]
                    )
                  )
                );
              }
              this.shouldInjectHelperCode = true;
            }
          }
        }
      },
      Program: {
        exit: function (path) {
          if (this.shouldInjectHelperCode) {
            // https://stackoverflow.com/a/35994497
            const identifier = t.identifier(JSBD);
            const importDefaultSpecifier = t.importDefaultSpecifier(identifier);
            const importDeclaration = t.importDeclaration(
              [importDefaultSpecifier],
              t.stringLiteral(IMPORT_PATH)
            );
            path.unshiftContainer('body', importDeclaration);
          }
        },
      },
    },
    pre: function () {
      this.shouldInjectHelperCode = false;
    },
    post: function (state) {
      if (this.shouldInjectHelperCode) {
        state.ast.program.body.unshift(babel.parse(maybeJSBDCode).program.body[0]);
      }
    },
  };
};

function isSafeDecimal(val) {
  return String(val) === String(Number(val));
}
