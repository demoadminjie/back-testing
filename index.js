const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const Table = require('cli-table3');
const csv = require('fast-csv');
const { max, min, evaluate } = require('mathjs');

const { buyAndHold, smaStrategy, smaStrategyWithVolume } = require('./strategy');

chalk.enabled = true;
chalk.level = 1;

const { red, green, yellow, blue, magenta, cyan } = chalk;

const evaluateFormat = (express) => {
  return Number(parseFloat(evaluate(express)).toFixed(2));
};

// 股票交易数据存储器
let trades = [];
let dates = [];

// 读取股票交易数据
fs.createReadStream(path.resolve(__dirname, '601012.csv'))
  .pipe(csv.parse({headers: true}))
  .on('data', (row) => {
    const newRow = {};
    for (const key in row) {
      if (key != 'date') {
        newRow[key] = parseFloat(row[key]);
      }
    }
    trades.push(newRow);
    dates.push(row.date);
  })
  .on('end', () => {
    const log0 = trading(trades, dates, buyAndHold, false);
    const log1 = trading(trades, dates, smaStrategy, false);
    const log2 = trading(trades, dates, smaStrategyWithVolume, false);
    consoleTable([log0, log1, log2]);
});

function consoleTable(logs) {
  const table = new Table({
    head: ['策略', '盈利', '交易次数', '券商手续费', '印花税'].map((item) => magenta(item)),
  });

  logs.forEach((log) => {
    table.push([
      cyan(log.name),
      log.totalProfit > 0 ? red(log.totalProfit) : green(log.totalProfit),
      yellow(log.TIMES),
      blue(log.ALL_HF),
      blue(log.ALL_STOST),
    ]);
  });

  console.log(table.toString());
}

function buy(buyPrice, capital, i, isConsole=true) {
  const HF = max(5, evaluateFormat(`${capital} * 0.0001`));
  let resultCapital = evaluateFormat(`${capital} - ${HF}`);
  const buyHands = Math.floor(resultCapital / (buyPrice * 100));
  resultCapital = evaluateFormat(`${resultCapital} - ${buyPrice} * ${buyHands} * 100`)
  if(isConsole) {
    console.log(`${dates[i]} Buy at: ${buyPrice}, hands: ${buyHands}, HF: ${HF}, capital: ${resultCapital}`);
  }

  return { resultCapital, buyHands, HF }
}

function sell(sellPrice, buyPrice, hands, capital, i, isConsole=true) {
  const profit = evaluateFormat(`(${sellPrice} - ${buyPrice}) * ${hands} * 100`);
  const sells = evaluateFormat(`${sellPrice} * ${hands} * 100`);
  const STOST = evaluateFormat(`${sells} * 0.0005`);

  const resultCapital = evaluateFormat(`${capital} + ${sells} - ${STOST}`);

  if(isConsole) {
    if (profit > 0) {
      console.log(red(`${dates[i]} Sell at: ${sellPrice}, Profit: ${profit}, STOST: ${STOST}, capital: ${resultCapital}`));
    } else {
      console.log(green(`${dates[i]} Sell at: ${sellPrice}, Profit: ${profit}, STOST: ${STOST}, capital: ${resultCapital}`));
    }
    console.log(`----------------------------------------------------------------------------------`);
  }

  return { resultCapital, STOST }
}

function trading(tardes, dates, strategy, isDetailConsole=true) {
  const operations = strategy(tardes);

  let buyPrice = 0;
  let hands = 0;
  let ALL_HF = 0;     // 券商手续费
  let ALL_STOST = 0;  // 印花税
  let TIMES = 0;      // 交易次数

  const initialCapital = 100000;
  let capital = initialCapital;
  
  let isBought = false;
  
  for(let i = 0; i < trades.length; i++) {
    const currentPrice = tardes[i].close;

    if (!isBought && operations[i]?.handle === 'buy') {
      isBought = true;
      buyPrice = operations[i]?.price || currentPrice;

      const { resultCapital, buyHands, HF } = buy(buyPrice, capital, i, isDetailConsole);

      ALL_HF = evaluateFormat(`${ALL_HF} + ${HF}`);
      capital = resultCapital;
      hands = buyHands;
    } else if (isBought && operations[i]?.handle === 'sell') {
      isBought = false;
      const sellPrice = operations[i]?.price || currentPrice;
        
      const { STOST, resultCapital } = sell(sellPrice, buyPrice, hands, capital, i, isDetailConsole);

      ALL_STOST = evaluateFormat(`${ALL_STOST} + ${STOST}`);
      capital = resultCapital;
      hands = 0;
      TIMES++;
    } else if ((isBought && operations[i]?.handle === 'buy') || (!isBought && operations[i]?.handle === 'sell')) {
      console.log(red(`${dates[i]} Error: ${operations[i]}`));
    }
  }

  // 如果仍有持仓，计算最终盈利
  if (isBought) {
    const sellPrice = trades[trades.length - 1].close;
    const sells = evaluateFormat(`${sellPrice} * ${hands} * 100`);
    const STOST = evaluateFormat(`${sells} * 0.0005`);
    ALL_STOST = evaluateFormat(`${ALL_STOST} + ${STOST}`);
    capital = evaluateFormat(`${capital} + ${sells} - ${STOST}`);
    TIMES++;
    if (isDetailConsole) {
      console.log(`${dates[trades.length - 1]} Sell at: ${sellPrice}, Sells: ${sells} STOST: ${STOST}`);
      console.log(`----------------------------------------------------------------------------------`);
    }
  }

  const totalProfit = evaluateFormat(`${capital} - ${initialCapital}`);

  if (isDetailConsole) {
    console.log(`${cyan(strategy.name)} Total Profit: ${totalProfit > 0 ? red(totalProfit) : green(totalProfit)}, TIMES: ${yellow(TIMES)}, ALL_HF: ${blue(ALL_HF)}, ALL_STOST: ${blue(ALL_STOST)}`);
  }

  return { name: strategy.name, totalProfit, TIMES, ALL_HF, ALL_STOST };
}
