const { buyAndHold, smaStrategy, smaStrategyWithVolume, smaComplexStrategy } = require('./strategy');
const { tradingItem } = require('./index');

const stocks = [ '000001', '0700HK', '600177', '600519', '601012', '601328', '601919' ];

stocks.forEach((stock) => {
  tradingItem(stock, [buyAndHold, smaStrategy, smaStrategyWithVolume, smaComplexStrategy]);
});
