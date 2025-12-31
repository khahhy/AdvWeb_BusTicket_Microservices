import { Test, TestingModule } from '@nestjs/testing';
import { RoutesService } from './routes.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '@app/shared';
import { SettingService } from '../setting/setting.service';
import { ClientProxy } from '@nestjs/microservices';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('RoutesService', () => {
  let service: RoutesService;
  let prismaService: PrismaService;
  let cacheManager: RedisCacheService;
  let settingService: SettingService;
  let supportClient: ClientProxy;
  let bookingClient: ClientProxy;

  const mockPrismaService = {
    routes: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    locations: {
      findUnique: jest.fn(),
    },
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delByPattern: jest.fn(),
  };

  const mockSettingService = {
    getSetting: jest.fn(),
    getBookingRules: jest.fn(),
  };

  const mockClientProxy = {
    send: jest.fn(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisCacheService,
          useValue: mockCacheManager,
        },
        {
          provide: SettingService,
          useValue: mockSettingService,
        },
        {
          provide: 'SUPPORT_SERVICE',
          useValue: mockClientProxy,
        },
        {
          provide: 'BOOKING_SERVICE',
          useValue: mockClientProxy,
        },
      ],
    }).compile();

    service = module.get<RoutesService>(RoutesService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheManager = module.get<RedisCacheService>(RedisCacheService);
    settingService = module.get<SettingService>(SettingService);
    supportClient = module.get<ClientProxy>('SUPPORT_SERVICE');
    bookingClient = module.get<ClientProxy>('BOOKING_SERVICE');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return a route by id', async () => {
      const mockRoute = {
        id: '1',
        name: 'Hà Nội - Sài Gòn',
        originLocationId: 'loc1',
        destinationLocationId: 'loc2',
      };

      mockPrismaService.routes.findUnique.mockResolvedValue(mockRoute);

      const result = await service.findOne('1');

      expect(result.data).toEqual(mockRoute);
      expect(mockPrismaService.routes.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when route not found', async () => {
      mockPrismaService.routes.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all routes', async () => {
      const mockRoutes = [
        {
          id: '1',
          name: 'Route 1',
          originLocationId: 'loc1',
          destinationLocationId: 'loc2',
        },
        {
          id: '2',
          name: 'Route 2',
          originLocationId: 'loc3',
          destinationLocationId: 'loc4',
        },
      ];

      mockPrismaService.routes.findMany.mockResolvedValue(mockRoutes);

      const result = await service.findAll();

      expect(result.data).toEqual(mockRoutes);
      expect(mockPrismaService.routes.findMany).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create a route successfully', async () => {
      const dto = {
        originLocationId: 'loc1',
        destinationLocationId: 'loc2',
        baseFare: 100000,
        distance: 100,
        estimatedDuration: 120,
      };

      const mockOrigin = { id: 'loc1', name: 'Hà Nội' };
      const mockDestination = { id: 'loc2', name: 'Sài Gòn' };
      const mockRoute = {
        id: '1',
        ...dto,
      };

      mockPrismaService.locations.findUnique
        .mockResolvedValueOnce(mockOrigin)
        .mockResolvedValueOnce(mockDestination);
      mockPrismaService.routes.create.mockResolvedValue(mockRoute);

      const result = await service.create(dto, 'user1', '127.0.0.1', 'UA');

      expect(result.message).toContain('created successfully');
      expect(mockPrismaService.routes.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when origin location not found', async () => {
      const dto = {
        originLocationId: 'invalid',
        destinationLocationId: 'loc2',
        baseFare: 100000,
      };

      mockPrismaService.locations.findUnique.mockResolvedValue(null);

      await expect(
        service.create(dto, 'user1', '127.0.0.1', 'UA'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a route', async () => {
      const mockRoute = {
        id: '1',
        baseFare: 100000,
      };

      const updateDto = {
        baseFare: 120000,
      };

      const updatedRoute = {
        ...mockRoute,
        ...updateDto,
      };

      mockPrismaService.routes.findUnique.mockResolvedValue(mockRoute);
      mockPrismaService.routes.update.mockResolvedValue(updatedRoute);

      const result = await service.update(
        '1',
        updateDto,
        'user1',
        '127.0.0.1',
        'UA',
      );

      expect(result.message).toContain('updated successfully');
      expect(mockPrismaService.routes.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when route not found', async () => {
      mockPrismaService.routes.findUnique.mockResolvedValue(null);

      await expect(
        service.update('999', {}, 'user1', '127.0.0.1', 'UA'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a route', async () => {
      const mockRoute = { id: '1', name: 'Route 1' };

      mockPrismaService.routes.findUnique.mockResolvedValue(mockRoute);
      mockPrismaService.routes.delete.mockResolvedValue(mockRoute);

      const result = await service.remove('1', 'user1', '127.0.0.1', 'UA');

      expect(result.message).toContain('deleted successfully');
      expect(mockPrismaService.routes.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when route not found', async () => {
      mockPrismaService.routes.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('999', 'user1', '127.0.0.1', 'UA'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
