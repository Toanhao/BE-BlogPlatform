import {BindingScope, injectable} from '@loopback/core';
import Redis from 'ioredis';

@injectable({scope: BindingScope.SINGLETON})
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

  private async getClient(): Promise<Redis | null> {
    try {
      if (this.client.status === 'wait') {
        await this.client.connect();
      }
      return this.client.status === 'ready' ? this.client : null;
    } catch {
      return null;
    }
  }

  // read key
  async getJson<T>(key: string): Promise<T | null> {
    try {
      const client = await this.getClient();
      if (!client) return null;

      const raw = await client.get(key);
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
      const client = await this.getClient();
      if (!client) return;

      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Ignore cache write errors to keep API responses reliable.
    }
  }

  async incrementWithExpiry(key: string, ttlSeconds: number): Promise<number> {
    try {
      const client = await this.getClient();
      if (!client) return 0;

      const count = await client.incr(key);

      if (count === 1) {
        await client.expire(key, ttlSeconds);
      }

      return count;
    } catch {
      // Fail-open for anti-spam checks when Redis is temporarily unavailable.
      return 0;
    }
  }

  async setIfNotExistsWithExpiry(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    try {
      const client = await this.getClient();
      if (!client) return true;

      const result = await client.set(key, value, 'EX', ttlSeconds, 'NX');

      return result === 'OK';
    } catch {
      // Fail-open for anti-spam checks when Redis is temporarily unavailable.
      return true;
    }
  }

  // delete key
  async deleteKey(key: string): Promise<void> {
    try {
      const client = await this.getClient();
      if (!client) return;

      await client.del(key);
    } catch {
      // Ignore cache delete errors to keep API responses reliable.
    }
  }

  // delete keys by pattern
  async deleteByPattern(pattern: string): Promise<void> {
    try {
      const client = await this.getClient();
      if (!client) return;

      let cursor = '0';
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          '100',
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await client.del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      // Ignore cache delete errors to keep API responses reliable.
    }
  }
}
