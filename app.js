const fs = require('fs');
const { buyAndHold, smaStrategy, smaWithVolume, smaWithVolumeAndStoploss, complexStrategy } = require('./strategy');
const { tradingItem } = require('./index');

// 定义要读取的文件夹路径
const stocksPath = './stocks';

const filterStock = ['000001', '600177', '600519', '601328'];

// 使用async/await确保按顺序执行
async function main() {
  const stocks = fs.readdirSync(stocksPath)
                    .filter(file => file.endsWith('.csv'))
                    .map(file => file.split('.').slice(0, -1).join('.'))
                    .filter(stock => !filterStock.includes(stock));

  for (const stock of stocks) {
  // for (const stock of ['000858']) {
    await tradingItem(stock, [buyAndHold, smaStrategy, smaWithVolume, smaWithVolumeAndStoploss, complexStrategy]);
    // await tradingItem(stock, [buyAndHold]);
  }
}

main().catch((error) => {
  console.error('Error:', error);
});
