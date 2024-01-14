const { format, evaluate } = require('mathjs');

const evaluateFormat = (express, options) => {
  return format(evaluate(express), {
    notation: 'fixed',
    precision: 2,
    ...options,
  });
};

module.exports = {
  evaluateFormat
}
