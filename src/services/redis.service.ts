import Redis from 'ioredis';

export class RedisService {
  private client: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
  }

  // read key
  async getJson<T>(key: string): Promise<T | null> {
    try {
      if (this.client.status === 'wait') {
        await this.client.connect();
      }

      const raw = await this.client.get(key);
      if (!raw) return null;

      return JSON.parse(raw) as T;
    } catch (err) {
      console.error('Redis GET error:', err);
      return null;
    }
  }

  // write key with TTL in seconds

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      if (this.client.status === 'wait') {
        await this.client.connect();
      }

      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Ignore cache write errors to keep API responses reliable.
    }
  }
 // delete key
  async deleteKey(key: string): Promise<void> {
    try {
      if (this.client.status === 'wait') {
        await this.client.connect();
      }

      await this.client.del(key);
    } catch {
      // Ignore cache delete errors to keep API responses reliable.
    }
  }
 // delete keys by pattern
  async deleteByPattern(pattern: string): Promise<void> {
    try {
      if (this.client.status === 'wait') {
        await this.client.connect();
      }

      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          '100',
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      // Ignore cache delete errors to keep API responses reliable.
    }
  }
}
