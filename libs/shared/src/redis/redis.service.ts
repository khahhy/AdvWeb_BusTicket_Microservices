import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  public client: RedisClientType;

  async onModuleInit() {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    this.client.on('error', (err) => console.error('Redis error', err));

    await this.client.connect();
    console.log(
      `Redis connected to ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    );
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.destroy();
      console.log('Redis disconnected');
    }
  }
}
