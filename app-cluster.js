const fs = require('fs');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

const { buyAndHold, smaStrategy, smaWithVolume, smaWithVolumeAndStoploss, complexStrategy } = require('./strategy');
const { tradingItem } = require('./index');

// 定义要读取的文件夹路径
const stocksPath = './stocks';

const filterStock = ['000001', '600177', '600519', '601328'];

const stocks = fs.readdirSync(stocksPath)
  .filter(file => file.endsWith('.csv'))
  .map(file => file.split('.').slice(0, -1).join('.'))
  .filter(stock => !filterStock.includes(stock));

if (cluster.isMaster) {
  console.time('cluster');

  // 创建工作进程
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  let currentIndex = 0;
  // 监听工作进程发送的消息
  cluster.on('message', (worker, message) => {
    if (message === 'ready') {
      if (currentIndex < stocks.length) {
        worker.send(stocks[currentIndex]);
        currentIndex++;
      } else {
        worker.kill(); // 所有任务完成，结束工作进程
      }
    }
  });

  let finishedWorkers = 0;
  cluster.on('exit', (worker, code, signal) => {
    // console.log(`Worker ${worker.process.pid} exited`);
    finishedWorkers++;

    // 当所有工作进程结束时，计算程序运行时间
    if (finishedWorkers === numCPUs) {
      console.timeEnd('cluster');
    }
  });

} else {
  // console.log(`Worker ${process.pid} started`);

  process.on('message', async (stock) => {
    await tradingItem(stock, [buyAndHold, smaStrategy, smaWithVolume, smaWithVolumeAndStoploss, complexStrategy]);
    process.send('ready'); // 通知主进程任务完成
  });

  process.send('ready'); // 通知主进程准备好接收任务
}
