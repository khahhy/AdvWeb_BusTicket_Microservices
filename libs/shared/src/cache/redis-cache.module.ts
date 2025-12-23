import { Module, Global } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { RedisCacheService } from './redis-cache.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [RedisCacheService],
  exports: [RedisCacheService],
})
export class RedisCacheModule {}
