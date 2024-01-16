/**
 * 所有的策略返回操作数组，里面的有操作 'buy' 'sell' 和 操作对应的价格（不必须，如果没有就默认为当天的close价）或者 null
 */
const { simpleMovingAverage } = require('./technical/ma');

const buyAndHold = (values) => {
  return values.map((item, index) =>  index === 0 ? { handle: 'buy' } : null );
}

const smaStrategy = (values) => {
  const sma5 = simpleMovingAverage(5, values.map((item) => item.close));
  const sma10 = simpleMovingAverage(10, values.map((item) => item.close));

  let postion = false;  // 是否持仓

  return sma5.map((item, index) => {
    if(item && sma10[index]) {
      if (!postion && item > sma10[index]) {
        postion = true;
        return { handle: 'buy' };
      } else if (postion && item < sma10[index]) {
        postion = false;
        return { handle: 'sell' };
      }
    } else {
      return null;
    }
  });
}

/**
 * 策略：
 * 买入信号：当短期均线上穿长期均线时，产生买入信号。例如，当5日均线上穿10日均线时
 * 卖出信号：当短期均线下穿长期均线时，产生卖出信号。例如，当5日均线下穿10日均线时
 */
const smaStrategyWithVolume = (values) => {
  const sma5 = simpleMovingAverage(5, values.map((item) => item.close));
  const sma10 = simpleMovingAverage(10, values.map((item) => item.close));

  const smaVolume = simpleMovingAverage(10, values.map((item) => item.volume));

  let postion = false;  // 是否持仓

  return sma5.map((item, index) => {
    if(item && sma10[index] && smaVolume[index]) {
      if (!postion && item > sma10[index] && values[index].volume > smaVolume[index]) {
        postion = true;
        return { handle: 'buy' };
      } else if (postion && item < sma10[index]) {
        postion = false;
        return { handle: 'sell' };
      }
    } else {
      return null;
    }
  });
}

module.exports = {
  buyAndHold,
  smaStrategy,
  smaStrategyWithVolume
}
