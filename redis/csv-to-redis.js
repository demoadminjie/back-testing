// import_data_to_redis.js
const fs = require('fs');
const path = require('path');
const fastcsv = require('fast-csv');
const { promisify } = require('util');

const client = require('./client');

const stocksPath = './stocks';

const readdirAsync = promisify(fs.readdir);

(async () => {
  await client.connect();
  try {
    const files = await readdirAsync(stocksPath);
    for (const file of files) {
      if (path.extname(file) === '.csv') {
        const stockId = path.basename(file, '.csv');
        const filePath = path.join(stocksPath, file);

        await client.del(`${stockId}`, (err) => {
          if (err) {
            reject(err);
          }
        });

        await new Promise((resolve) => {
          fs.createReadStream(filePath)
            .pipe(fastcsv.parse({ headers: true }))
            .on('data', async (row) => {
              await client.rPush(`${stockId}`, JSON.stringify(row), (err) => {
                if (err) {
                  reject(err);
                }
              });
            })
            .on('end', () => {
              console.log(`Data imported to Redis for stock ${stockId}`);
              resolve();
            });
        });
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.quit();
  }
})();
