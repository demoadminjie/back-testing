const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const { macdStartegy } = require('./strategy');

const stockId = '601919';

const trades = [];
const dates = [];

fs.createReadStream(path.resolve(__dirname , 'stocks', stockId + '.csv'))
  .pipe(csv.parse({headers: true}))
  .on('data', (row) => {
    const newRow = {};
    for (const key in row) {
      if (key != 'date') {
        newRow[key] = parseFloat(row[key]);
      }
    }
    trades.push({ ...newRow, date: row.date });
    dates.push(row.date);
  })
  .on('end', () => {
    const result = macdStartegy(trades);
    console.log(result);
  })
  .on('error', (error) => {
    console.log(error); // 当出现错误时，调用reject()表示Promise已失败
  });
