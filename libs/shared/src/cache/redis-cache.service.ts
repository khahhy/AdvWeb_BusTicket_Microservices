import { Injectable, Inject, Optional } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RedisCacheService {
  private prefix: string = '';

  constructor(
    private readonly redis: RedisService,
    @Optional() @Inject('REDIS_PREFIX') prefix?: string,
  ) {
    if (prefix) this.prefix = `${prefix}:`;
  }

  private getKey(key: string): string {
    return this.prefix + key;
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.client.get(this.getKey(key));
    return value ? (JSON.parse(value) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    await this.redis.client.set(this.getKey(key), JSON.stringify(value), {
      EX: ttlSeconds,
    });
  }

  async setNX<T>(
    key: string,
    value: T,
    ttlSeconds = 300,
  ): Promise<string | null> {
    return this.redis.client.set(this.getKey(key), JSON.stringify(value), {
      EX: ttlSeconds,
      NX: true,
    });
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.client.exists(this.getKey(key))) === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.redis.client.ttl(this.getKey(key));
  }

  async del(key: string): Promise<number> {
    return this.redis.client.del(this.getKey(key));
  }

  async delByPattern(pattern: string): Promise<void> {
    const keys = await this.redis.client.keys(this.getKey(pattern));

    if (keys.length > 0) {
      await this.redis.client.del(keys);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    return this.redis.client.keys(this.getKey(pattern));
  }
}
