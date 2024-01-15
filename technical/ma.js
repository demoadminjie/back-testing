/**
 * Calculate the simple moving average from stock prices.
 * @param {Array} prices - The list of prices.
 * @param {number} interval - The number of periods to calculate.
 * @return {Array} The list of SMA value.
 */
const SMA = require('technicalindicators').SMA;
const { fillMALine } = require('./tools');

const simpleMovingAverage = (period, values) => fillMALine(SMA.calculate({period, values}), values.length);

module.exports = {
  simpleMovingAverage
}
