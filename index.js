const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const Table = require('cli-table3');
const csv = require('fast-csv');
const { max, min, evaluate } = require('mathjs');

chalk.enabled = true;
chalk.level = 1;

const { red, green, yellow, blue, magenta, cyan } = chalk;

const HANDFEE = 0.00013;
const STOSTFEE = 0.0005;

const evaluateFormat = (express) => {
  return Number(parseFloat(evaluate(express)).toFixed(2));
};

function tradingItem(stockId, strategys) {
  return new Promise((resolve) => {
    // 股票交易数据存储器
    let trades = [];
    let dates = [];

    // 读取股票交易数据
    fs.createReadStream(path.resolve(__dirname , 'stocks', stockId + '.csv'))
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
        const logs = strategys.map((strategy) => trading(trades, dates, strategy, strategys.length === 1));
        resolve({logs, stockId});
        consoleTable(logs, stockId);
      })
      .on('error', (error) => {
        reject(error); // 当出现错误时，调用reject()表示Promise已失败
      });
  });
}

function tradingItemByRedis(stockId, stocks, strategys) {
  const trades = [];
  const dates = [];

  stocks.forEach((row) => {
    const newRow = {};
    for (const key in row) {
      if (key != 'date') {
        newRow[key] = parseFloat(row[key]);
      }
    }
    trades.push(newRow);
    dates.push(row.date);
  });

  const logs = strategys.map((strategy) => trading(trades, dates, strategy, strategys.length === 1));
  consoleTable(logs, stockId);
}

function consoleTable(logs, stockItem) {
  const table = new Table({
    head: [ stockItem + ' 策略', '盈利', '交易次数', '交易成功次数', '券商手续费', '印花税' ].map((item) => magenta(item)),
  });

  logs.forEach((log) => {
    const profitInfo = `${ log.totalProfit } (${ evaluateFormat(`${log.totalProfit} / ${log.initialCapital} * 100`) }%)`;
    table.push([
      cyan(log.name),
      log.totalProfit > 0 ? red(profitInfo) : green(profitInfo),
      yellow(log.TIMES),
      red(`${ log.SUCCESS_TIMES } (${ evaluateFormat(`${log.SUCCESS_TIMES} / ${log.TIMES} * 100`) }%)`),
      blue(log.ALL_HF),
      blue(log.ALL_STOST),
    ]);
  });

  console.log(table.toString());
}

function buy(buyPrice, capital, i, dates, isConsole=true) {
  // 计算能够购买的股票手数，券商是要收股票手数和手续费加起来不能超过总资金；
  // 如股价为1块的股票，100000块不能买1000手，而是买999手
  const buyHands = Math.floor(capital / evaluateFormat(`${buyPrice} * 100 * (1 + ${HANDFEE})`));

  const buyCost = evaluateFormat(`${buyPrice} * ${buyHands} * 100`);
  const HF = max(5, evaluateFormat(`${buyCost} * ${HANDFEE}`));

  const resultCapital = evaluateFormat(`${capital} - ${HF} - ${buyCost}`);
  if(isConsole) {
    console.log(`${dates[i]} Buy at: ${buyPrice}, hands: ${buyHands}, HF: ${HF}, capital: ${resultCapital}`);
  }

  return { resultCapital, buyHands, HF }
}

function sell(sellPrice, buyPrice, hands, capital, i, dates, isConsole=true) {
  const profit = evaluateFormat(`(${sellPrice} - ${buyPrice}) * ${hands} * 100`);
  const sells = evaluateFormat(`${sellPrice} * ${hands} * 100`);
  const STOST = evaluateFormat(`${sells} * ${STOSTFEE}`);
  const resultCapital = evaluateFormat(`${capital} + ${sells} - ${STOST}`);

  if(isConsole) {
    if (profit > 0) {
      console.log(red(`${dates[i]} Sell at: ${sellPrice}, Profit: ${profit}, STOST: ${STOST}, capital: ${resultCapital}`));
    } else {
      console.log(green(`${dates[i]} Sell at: ${sellPrice}, Profit: ${profit}, STOST: ${STOST}, capital: ${resultCapital}`));
    }
    console.log(`----------------------------------------------------------------------------------`);
  }

  return { resultCapital, STOST, isSuccess: profit > 0 }
}

function trading(trades, dates, strategy, isDetailConsole=true) {
  const operations = strategy(trades);

  let buyPrice = 0;
  let hands = 0;
  let ALL_HF = 0;     // 券商手续费
  let ALL_STOST = 0;  // 印花税
  let TIMES = 0;      // 交易次数
  let SUCCESS_TIMES = 0;  // 交易成功次数

  const initialCapital = 1000000;
  let capital = initialCapital;
  
  let isBought = false;
  
  for(let i = 0; i < trades.length; i++) {
    const currentPrice = trades[i].close;

    if (!isBought && operations[i]?.handle === 'buy') {
      isBought = true;
      buyPrice = operations[i]?.price || currentPrice;

      const { resultCapital, buyHands, HF } = buy(buyPrice, capital, i, dates, isDetailConsole);

      ALL_HF = evaluateFormat(`${ALL_HF} + ${HF}`);
      capital = resultCapital;
      hands = buyHands;
    } else if (isBought && operations[i]?.handle === 'sell') {
      isBought = false;
      const sellPrice = operations[i]?.price || currentPrice;
        
      const { STOST, resultCapital, isSuccess } = sell(sellPrice, buyPrice, hands, capital, i, dates, isDetailConsole);

      ALL_STOST = evaluateFormat(`${ALL_STOST} + ${STOST}`);
      capital = resultCapital;
      hands = 0;
      TIMES++;
      isSuccess && SUCCESS_TIMES++;
    } else if ((isBought && operations[i]?.handle === 'buy') || (!isBought && operations[i]?.handle === 'sell')) {
      console.log(red(`${dates[i]} Error: ${operations[i]}`));
    }
  }

  // 如果仍有持仓，计算最终盈利
  if (isBought) {
    const sellPrice = trades[trades.length - 1].close;
    const { STOST, resultCapital, isSuccess } = sell(sellPrice, buyPrice, hands, capital, trades.length - 1, dates, isDetailConsole);

    ALL_STOST = evaluateFormat(`${ALL_STOST} + ${STOST}`);
    capital = resultCapital;
    hands = 0;
    TIMES++;
    isSuccess && SUCCESS_TIMES++;
  }

  const totalProfit = evaluateFormat(`${capital} - ${initialCapital}`);

  if (isDetailConsole) {
    console.log(`${cyan(strategy.name)} Total Profit: ${totalProfit > 0 ? red(totalProfit) : green(totalProfit)}, TIMES: ${yellow(TIMES)}, SUCCESS_TIMES: ${red(SUCCESS_TIMES)}, ALL_HF: ${blue(ALL_HF)}, ALL_STOST: ${blue(ALL_STOST)}`);
    console.log(`----------------------------------------------------------------------------------`);
  }

  return { name: strategy.name, totalProfit, TIMES, ALL_HF, ALL_STOST, SUCCESS_TIMES, initialCapital };
}

module.exports = {
  tradingItem,
  tradingItemByRedis
}
