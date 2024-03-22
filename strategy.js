/**
 * 所有的策略返回操作数组，里面的有操作 'buy' 'sell' 和 操作对应的价格（不必须，如果没有就默认为当天的close价）或者 null
 */
const { simpleMovingAverage } = require('./technical/ma');

const { MACD } = require('technicalindicators');

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
const smaWithVolume = (values) => {
  const sma5 = simpleMovingAverage(5, values.map((item) => item.close));
  const sma60 = simpleMovingAverage(60, values.map((item) => item.close));

  const smaVolume = simpleMovingAverage(10, values.map((item) => item.volume));

  let postion = false;  // 是否持仓

  return sma5.map((item, index) => {
    if(item && sma60[index] && smaVolume[index]) {
      if (!postion && item > sma60[index] && values[index].volume > smaVolume[index]) {
        postion = true;
        return { handle: 'buy' };
      } else if (postion && item < sma60[index]) {
        postion = false;
        return { handle: 'sell' };
      }
    } else {
      return null;
    }
  });
}

const macdStartegy = (values) => {
  const EMA_SHORT = 12;
  const EMA_LONG = 26;
  const SIGNAL_PERIOD = 9;

  const prices = values.map((item) =>item.close);
  const macdInput = {
    values: prices,
    fastPeriod: EMA_SHORT,
    slowPeriod: EMA_LONG,
    signalPeriod: SIGNAL_PERIOD,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  };

  const macdOutput = MACD.calculate(macdInput);

  let postion = false;

  const options = values.map((item, index) => {
    if (index >= EMA_LONG) {
      const prevMACD = macdOutput[index - (EMA_LONG - 1) - 1].histogram;
      const currentMACD = macdOutput[index - (EMA_LONG - 1)].histogram;
      if (!postion && prevMACD <= 0 && currentMACD > 0) {
        postion = true;
        return { handle: 'buy' };
      }
  
      if (postion &&  prevMACD >= 0 && currentMACD < 0 ) {
        postion = false;
        return { handle: 'sell' };
      }
    } else {
      return null;
    }
  });

  return options;
}

const complexStrategy = (values) => {
  const prices = values.map((item) =>item.close);
  const sma50 = simpleMovingAverage(50, prices);
  const sma100 = simpleMovingAverage(100, prices);

  const smaVolume = simpleMovingAverage(10, values.map((item) => item.volume));

  let postion = false;

  return prices.map((item, index) => {
    if (sma50[index] && sma100[index] && smaVolume[index]) {
      if (!postion && item > sma50[index] && sma50[index] > sma100[index] && smaVolume[index] > 1000000) {
        postion = true;
        return { handle: 'buy' };
      } else if (postion &&(item < sma50[index] || sma50[index] < sma100[index] || smaVolume[index] < 1000000)) {
        postion = false;
        return { handle: 'sell' };
      }
    } else {
      return null;
    }
  });
}

const gridStrategy = (values) => {
  const prices = values.map((item) =>item.close);

  const grid = .05;

  let prevPrice = 0;

  return prices.map((item, index) => {
     if (item > prices[index - 1] * (1 + grid)) {
      prevPrice = item;
      return { handle: '', hand: Math.floor(2000 / item) }
    } else if (item < prices[index - 1] * (1 - grid)) {
      prevPrice = item;
      return { handle: '', hand: Math.floor(2000 / item) }
    } else if (index === 0) {
      return { handle: 'buy', hand: Math.floor(2000 / item) };
    } else {
      return null;
    }
  });
}

// 终极交易法，发明时光机，看到未来的价格，然后买入&卖出
const godStrategy = (values) => {
  const prices = values.map((item) =>item.close);
  let postion = false;
  return prices.map((item, index) => {
    if (index < prices.length) {
      if (!postion && item < prices[index + 1]) {
        postion = true;
        return { handle: 'buy' };
      } else if (postion && item > prices[index + 1]) {
        postion = false;
        return { handle: 'sell' };
      } else {
        return null;
      }
    }
  });
}

module.exports = {
  buyAndHold,
  smaStrategy,
  smaWithVolume,
  macdStartegy,
  complexStrategy,
  godStrategy,
}
