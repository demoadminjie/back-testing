const fs = require('fs');
const { buyAndHold, smaStrategy, smaWithVolume, smaWithVolumeAndStoploss, complexStrategy } = require('./strategy');
const { tradingItemByRedis } = require('./index');
const client = require('./redis/client');

// 定义要读取的文件夹路径
const stocksPath = './stocks';

const filterStock = [] || ['000001', '600177', '600519', '601328'];

// 使用async/await确保按顺序执行
async function main() {
  console.time('redis');
  await client.connect();
  const stocks = fs.readdirSync(stocksPath)
                    .filter(file => file.endsWith('.csv'))
                    .map(file => file.split('.').slice(0, -1).join('.'))
                    .filter(stock => !filterStock.includes(stock));

  for (const stock of stocks) {
    const data = await client.lrange(stock);
    tradingItemByRedis(stock, data, [buyAndHold, smaStrategy, smaWithVolume, smaWithVolumeAndStoploss, complexStrategy]);
  }
  await client.quit();
  console.timeEnd('redis');
}

main().catch((error) => {
  console.error('Error:', error);
});
