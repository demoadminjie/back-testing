const redis = require('redis');

class RedisClient {
  constructor() {
    if (!RedisClient.instance) {
      this.client = redis.createClient();
      this.client['lrange'] = this.lrange;
      RedisClient.instance = this;
    }

    return RedisClient.instance.client;
  }

  async lrange(stockId) {
    const data = await this.lRange(stockId, 0, -1, (err, data) => {
      if (err) {
        console.error('Error:', err);
        return;
      }
    });
    return data.map((item) => JSON.parse(item));
  } 
}

module.exports = new RedisClient();
