import { Test, TestingModule } from '@nestjs/testing';
import { RedisCacheService } from './redis-cache.service';
import { RedisService } from '../redis/redis.service';

describe('RedisCacheService', () => {
  let service: RedisCacheService;
  let redisService: RedisService;

  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    exists: jest.fn(),
    ttl: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  };

  const mockRedisService = {
    client: mockRedisClient,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: 'REDIS_PREFIX',
          useValue: 'test',
        },
      ],
    }).compile();

    service = module.get<RedisCacheService>(RedisCacheService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should retrieve value from cache', async () => {
      const key = 'test-key';
      const value = { id: '1', name: 'Test' };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(value));

      const result = await service.get(key);

      expect(result).toEqual(value);
      expect(mockRedisClient.get).toHaveBeenCalledWith('test:test-key');
    });

    it('should return null when key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in cache with TTL', async () => {
      const key = 'test-key';
      const value = { id: '1', name: 'Test' };
      const ttl = 300;

      mockRedisClient.set.mockResolvedValue('OK');

      await service.set(key, value, ttl);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test:test-key',
        JSON.stringify(value),
        { EX: ttl },
      );
    });

    it('should use default TTL when not specified', async () => {
      const key = 'test-key';
      const value = { id: '1' };

      mockRedisClient.set.mockResolvedValue('OK');

      await service.set(key, value);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test:test-key',
        JSON.stringify(value),
        { EX: 300 },
      );
    });
  });

  describe('setNX', () => {
    it('should set value only if key does not exist', async () => {
      const key = 'test-key';
      const value = { id: '1' };

      mockRedisClient.set.mockResolvedValue('OK');

      const result = await service.setNX(key, value);

      expect(result).toBe('OK');
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test:test-key',
        JSON.stringify(value),
        { EX: 300, NX: true },
      );
    });

    it('should return null if key already exists', async () => {
      const key = 'existing-key';
      const value = { id: '1' };

      mockRedisClient.set.mockResolvedValue(null);

      const result = await service.setNX(key, value);

      expect(result).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true if key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await service.exists('test-key');

      expect(result).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith('test:test-key');
    });

    it('should return false if key does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await service.exists('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('ttl', () => {
    it('should return time to live for key', async () => {
      mockRedisClient.ttl.mockResolvedValue(120);

      const result = await service.ttl('test-key');

      expect(result).toBe(120);
      expect(mockRedisClient.ttl).toHaveBeenCalledWith('test:test-key');
    });
  });

  describe('del', () => {
    it('should delete key from cache', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      const result = await service.del('test-key');

      expect(result).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith('test:test-key');
    });
  });

  describe('delByPattern', () => {
    it('should delete all keys matching pattern', async () => {
      const pattern = 'test:*';
      const keys = ['test:key1', 'test:key2', 'test:key3'];

      mockRedisClient.keys.mockResolvedValue(keys);
      mockRedisClient.del.mockResolvedValue(3);

      await service.delByPattern('*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(keys);
    });

    it('should not call del when no keys match pattern', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      await service.delByPattern('non-existent:*');

      expect(mockRedisClient.keys).toHaveBeenCalled();
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('keys', () => {
    it('should return all keys matching pattern', async () => {
      const keys = ['test:key1', 'test:key2'];

      mockRedisClient.keys.mockResolvedValue(keys);

      const result = await service.keys('*');

      expect(result).toEqual(keys);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('test:*');
    });
  });
});
