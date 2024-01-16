const fs = require('fs');
const { buyAndHold, smaStrategy, smaStrategyWithVolume, smaComplexStrategy } = require('./strategy');
const { tradingItem } = require('./index');

// 定义要读取的文件夹路径
const stocksPath = './stocks';

// 使用async/await确保按顺序执行
async function main() {
  const stocks = fs.readdirSync(stocksPath).filter(file => file.endsWith('.csv')).map(file => file.split('.').slice(0, -1).join('.'));

  for (const stock of stocks) {
    await tradingItem(stock, [buyAndHold, smaStrategy, smaStrategyWithVolume, smaComplexStrategy]);
  }
}

main().catch((error) => {
  console.error('Error:', error);
});
