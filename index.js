const tulind = require('tulind');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const { max, min, evaluate } = require('mathjs');

chalk.enabled = true;
chalk.level = 1;

const evaluateFormat = (express) => {
  return Number(parseFloat(evaluate(express)).toFixed(2));
};

// 股票交易数据存储器
let trades = [];
let dates = [];

// 读取股票交易数据
fs.createReadStream(path.resolve(__dirname, 'data.csv'))
  .pipe(csv.parse({headers: true}))
  .on('data', (row) => {
    trades.push(parseFloat(row.close));
    dates.push(row.date);
  })
  .on('end', () => {
    // smaTrading();
    tutrtleTrading();
});

// 简单的策略，使用SMA（Simple Moving Average）作为交易信号
function smaTrading() {
  let period = 15; // 要计算的SMA的时间周期
  let options = {
    low: [],   // 存放最低价的数组
    high: [],  // 存放最高价的数组
  };

  // 填充选项，数组中放入对应数据
  trades.forEach((price) => {
    options.low.push(price);
    options.high.push(price);
  });

  // 计算 SMA
  tulind.indicators.sma.indicator([trades], [period], function (err, result) {
    // 处理错误
    if (err) {
      console.log(err);
      return;
    }

    let sma = result[0];

    // 开始回测
    let position = false; // 是否持仓
    let buyPrice = 0;    // 购买价格
    let initialCapital = 100000; // 初始资金
    let capital = initialCapital;
    let hands = 0;
    let ALL_HF = 0;     // 券商手续费
    let ALL_STOST = 0;  // 印花税

    for (let i = period; i < trades.length; i++) {
      // 比较当前价格与SMA值
      if (trades[i] > sma[i - period] && position === false) {
        // 购买
        position = true;
        buyPrice = trades[i];
        const HF = max(5, evaluateFormat(`${capital} * 0.0001`));
        capital = evaluateFormat(`${capital} - ${HF}`);
        ALL_HF = evaluateFormat(`${ALL_HF} + ${HF}`);
        hands = Math.floor(capital / (buyPrice * 100));
        capital = evaluateFormat(`${capital} - ${buyPrice} * ${hands} * 100`)
        console.log(`${dates[i]} Buy at: ${buyPrice}, hands: ${hands}, HF: ${HF}, capital: ${capital}`);
      } else if (trades[i] < sma[i - period] && position === true) {
        // 卖出
        position = false;
        const sellPrice = trades[i];
        const profit = evaluateFormat(`(${sellPrice} - ${buyPrice}) * ${hands} * 100`);
        const sells = evaluateFormat(`${sellPrice} * ${hands} * 100`);
        const STOST = evaluateFormat(`${sells} * 0.0005`);
        ALL_STOST = evaluateFormat(`${ALL_STOST} + ${STOST}`);
        hands = 0;
        capital = evaluateFormat(`${capital} + ${sells} - ${STOST}`);
        if (profit > 0) {
          console.log(chalk.red(`${dates[i]} Sell at: ${sellPrice}, Profit: ${profit}, STOST: ${STOST},  capital: ${capital}`));
        } else {
          console.log(chalk.green(`${dates[i]} Sell at: ${sellPrice}, Profit: ${profit}, STOST: ${STOST},  capital: ${capital}`));
        }
        console.log(`----------------------------------------------------------------------------------`)
      }
    }

    // 如果仍有持仓，计算最终盈利
    if (position) {
      const sellPrice = trades[trades.length - 1];
      const sells = evaluateFormat(`${sellPrice} * ${hands} * 100`);
      const STOST = evaluateFormat(`${sells} * 0.0005`);
      ALL_STOST = evaluateFormat(`${ALL_STOST} + ${STOST}`);
      capital = evaluateFormat(`${capital} + ${sells} - ${STOST}`);
      console.log(`${dates[trades.length - 1]} Sell at: ${sellPrice}, Sells: ${sells} STOST: ${STOST}`);
    }

    console.log(`Total Profit: ${evaluateFormat(`${capital} - ${initialCapital}`)}, HF: ${ALL_HF}, STOST: ${ALL_STOST}`);
  });
}

// 海龟交易法
function tutrtleTrading() {
  let lastPrice = parseFloat(trades[0]);
  let maxPrice = lastPrice;
  let minPrice = lastPrice;
  let buyPrice = 0;
  let sellingPrice = 0;
  let buyingPrice = 0;
  let hands = 0;
  let ALL_HF = 0;     // 券商手续费
  let ALL_STOST = 0;  // 印花税

  const k = 0.02; //风险系数

  const initialCapital = 100000;
  let capital = initialCapital;

  let isBought = false;

  for (let i = 1; i < trades.length; i++) {
    let currentPrice = trades[i];
    maxPrice = max(currentPrice, maxPrice);
    minPrice = min(currentPrice, minPrice);

    if (!isBought) {
      buyingPrice = maxPrice * (1 - k);
      if (currentPrice > buyingPrice) {
        isBought = true;
        buyPrice = currentPrice;

        const { resultCapital, buyHands, HF } = buy(buyPrice, capital, i);

        ALL_HF = evaluateFormat(`${ALL_HF} + ${HF}`);
        capital = resultCapital;
        hands = buyHands;
      }
    } else {
      sellingPrice = minPrice * (1 + k);
      if (currentPrice < sellingPrice) {
        isBought = false;
        maxPrice = currentPrice;
        minPrice = currentPrice;
        const sellPrice = currentPrice;
        
        const { STOST, resultCapital } = sell(sellPrice, buyPrice, hands, capital, i);

        ALL_STOST = evaluateFormat(`${ALL_STOST} + ${STOST}`);
        capital = resultCapital;
        hands = 0;
      }
    }
  }

  // 如果仍有持仓，计算最终盈利
  if (isBought) {
    const sellPrice = trades[trades.length - 1];
    const sells = evaluateFormat(`${sellPrice} * ${hands} * 100`);
    const STOST = evaluateFormat(`${sells} * 0.0005`);
    ALL_STOST = evaluateFormat(`${ALL_STOST} + ${STOST}`);
    capital = evaluateFormat(`${capital} + ${sells} - ${STOST}`);
    console.log(`${dates[trades.length - 1]} Sell at: ${sellPrice}, Sells: ${sells} STOST: ${STOST}`);
  }

  console.log(`Total Profit: ${evaluateFormat(`${capital} - ${initialCapital}`)}, HF: ${ALL_HF}, STOST: ${ALL_STOST}`);
}

function buy(buyPrice, capital, i) {
  const HF = max(5, evaluateFormat(`${capital} * 0.0001`));
  let resultCapital = evaluateFormat(`${capital} - ${HF}`);
  const buyHands = Math.floor(resultCapital / (buyPrice * 100));
  resultCapital = evaluateFormat(`${resultCapital} - ${buyPrice} * ${buyHands} * 100`)
  console.log(`${dates[i]} Buy at: ${buyPrice}, hands: ${buyHands}, HF: ${HF}, capital: ${resultCapital}`);

  return { resultCapital, buyHands, HF }
}

function sell(sellPrice, buyPrice, hands, capital, i) {
  const profit = evaluateFormat(`(${sellPrice} - ${buyPrice}) * ${hands} * 100`);
  const sells = evaluateFormat(`${sellPrice} * ${hands} * 100`);
  const STOST = evaluateFormat(`${sells} * 0.0005`);

  const resultCapital = evaluateFormat(`${capital} + ${sells} - ${STOST}`);
  if (profit > 0) {
    console.log(chalk.red(`${dates[i]} Sell at: ${sellPrice}, Profit: ${profit}, STOST: ${STOST},  capital: ${resultCapital}`));
  } else {
    console.log(chalk.green(`${dates[i]} Sell at: ${sellPrice}, Profit: ${profit}, STOST: ${STOST},  capital: ${resultCapital}`));
  }
  console.log(`----------------------------------------------------------------------------------`);

  return { resultCapital, STOST }
}
