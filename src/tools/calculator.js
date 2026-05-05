'use strict';

const { evaluate } = require('mathjs');

/**
 * calculator tool
 *
 * Safely evaluates a mathematical expression using mathjs.
 * mathjs has its own parser — no raw eval() is ever used,
 * so arbitrary code execution is not possible.
 *
 * Examples:
 *   "2^16"              → "65536"
 *   "sqrt(1764) * 3"    → "126"
 *   "log(1000, 10)"     → "3"
 *   "sin(pi / 2)"       → "1"
 */
const calculator = {
  name: 'calculator',

  description:
    'Evaluates a mathematical expression and returns the numeric result. ' +
    'Supports arithmetic, exponentiation (^), square roots (sqrt), ' +
    'trigonometry (sin, cos, tan), logarithms (log), and constants (pi, e). ' +
    'Use this tool whenever the user asks a question involving math or numbers.',

  inputSchema: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description:
          'The mathematical expression to evaluate, e.g. "sqrt(144) + 2^8"',
      },
    },
    required: ['expression'],
  },

  /**
   * @param {{ expression: string }} args
   * @returns {Promise<string>}
   */
  async execute({ expression }) {
    try {
      const result = evaluate(expression);

      // mathjs can return matrices, units, or other complex types.
      // We convert everything to a clean string for the LLM.
      const formatted =
        typeof result === 'object' && result !== null
          ? result.toString()
          : String(result);

      return `Result: ${formatted}`;
    } catch (err) {
      return `Error evaluating expression "${expression}": ${err.message}. ` +
        'Please provide a valid mathematical expression.';
    }
  },
};

module.exports = calculator;
