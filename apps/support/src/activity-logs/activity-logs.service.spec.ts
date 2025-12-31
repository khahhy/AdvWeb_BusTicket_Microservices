import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLogsService } from './activity-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityLogDto } from '@app/shared/dto';

describe('ActivityLogsService', () => {
  let service: ActivityLogsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    activityLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ActivityLogsService>(ActivityLogsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logAction', () => {
    it('should log an activity', async () => {
      const dto: CreateActivityLogDto = {
        userId: 'user1',
        action: 'LOGIN',
        entityId: 'entity1',
        entityType: 'USER',
        metadata: { browser: 'Chrome' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockLog = {
        id: '1',
        ...dto,
        createdAt: new Date(),
      };

      mockPrismaService.activityLog.create.mockResolvedValue(mockLog);

      await service.logAction(dto);

      expect(mockPrismaService.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: dto.userId,
          action: dto.action,
          entityId: dto.entityId,
          entityType: dto.entityType,
          metadata: dto.metadata,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
        },
      });
    });

    it('should handle errors gracefully', async () => {
      const dto: CreateActivityLogDto = {
        userId: 'user1',
        action: 'LOGIN',
        entityId: 'entity1',
        entityType: 'USER',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      mockPrismaService.activityLog.create.mockRejectedValue(
        new Error('Database error'),
      );

      // Should not throw error
      await expect(service.logAction(dto)).resolves.not.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return paginated activity logs', async () => {
      const mockLogs = [
        {
          id: '1',
          userId: 'user1',
          action: 'LOGIN',
          createdAt: new Date(),
        },
        {
          id: '2',
          userId: 'user2',
          action: 'LOGOUT',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.$transaction.mockResolvedValue([mockLogs, 2]);

      const result = await service.findAll(1, 20);

      expect(result.message).toBe('Fetched activity logs successfully');
      expect(result.data.logs).toEqual(mockLogs);
      expect(result.data.meta).toEqual({
        total: 2,
        page: 1,
        lastPage: 1,
      });
    });

    it('should handle pagination correctly', async () => {
      const mockLogs = Array(20).fill({
        id: '1',
        userId: 'user1',
        action: 'LOGIN',
      });

      mockPrismaService.$transaction.mockResolvedValue([mockLogs, 100]);

      const result = await service.findAll(2, 20);

      expect(result.data.meta.page).toBe(2);
      expect(result.data.meta.total).toBe(100);
      expect(result.data.meta.lastPage).toBe(5);
    });
  });

  describe('findByUser', () => {
    it('should return activity logs for a specific user', async () => {
      const mockLogs = [
        {
          id: '1',
          userId: 'user1',
          action: 'LOGIN',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.$transaction.mockResolvedValue([mockLogs, 1]);

      const result = await service.findByUser('user1', 1, 20);

      expect(result.message).toBe('Fetched user activity logs successfully');
      expect(result.data.logs).toEqual(mockLogs);
    });
  });

  describe('findByEntity', () => {
    it('should return activity logs for a specific entity', async () => {
      const mockLogs = [
        {
          id: '1',
          entityId: 'entity1',
          entityType: 'BOOKING',
          action: 'CREATE',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.$transaction.mockResolvedValue([mockLogs, 1]);

      const result = await service.findByEntity('entity1', 'BOOKING', 1, 20);

      expect(result.message).toBe('Fetched entity activity logs successfully');
      expect(result.data.logs).toEqual(mockLogs);
    });
  });
});
