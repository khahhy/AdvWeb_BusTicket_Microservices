import { Test, TestingModule } from '@nestjs/testing';
import { BusesService } from './buses.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '@app/shared';
import { ClientProxy } from '@nestjs/microservices';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BusType } from '@prisma/client-trip';

describe('BusesService', () => {
  let service: BusesService;
  let prismaService: PrismaService;
  let cacheManager: RedisCacheService;
  let supportClient: ClientProxy;

  const mockPrismaService = {
    buses: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    seats: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delByPattern: jest.fn(),
  };

  const mockClientProxy = {
    send: jest.fn(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisCacheService,
          useValue: mockCacheManager,
        },
        {
          provide: 'SUPPORT_SERVICE',
          useValue: mockClientProxy,
        },
      ],
    }).compile();

    service = module.get<BusesService>(BusesService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheManager = module.get<RedisCacheService>(RedisCacheService);
    supportClient = module.get<ClientProxy>('SUPPORT_SERVICE');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return a bus by id', async () => {
      const mockBus = {
        id: '1',
        licensePlate: '29A-12345',
        type: BusType.standard,
        totalSeats: 32,
      };

      mockPrismaService.buses.findUnique.mockResolvedValue(mockBus);

      const result = await service.findOne('1');

      expect(result.data).toEqual(mockBus);
      expect(mockPrismaService.buses.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when bus not found', async () => {
      mockPrismaService.buses.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated buses', async () => {
      const mockBuses = [
        { id: '1', licensePlate: '29A-12345', type: BusType.standard },
        { id: '2', licensePlate: '30B-67890', type: BusType.limousine },
      ];

      mockPrismaService.buses.findMany.mockResolvedValue(mockBuses);
      mockPrismaService.buses.count.mockResolvedValue(2);

      const query = { page: 1, limit: 10 };
      const result = await service.findAll(query);

      expect(result.data).toEqual(mockBuses);
      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter buses by type', async () => {
      const mockBuses = [
        { id: '1', licensePlate: '29A-12345', type: BusType.standard },
      ];

      mockPrismaService.buses.findMany.mockResolvedValue(mockBuses);
      mockPrismaService.buses.count.mockResolvedValue(1);

      const query = { page: 1, limit: 10, type: BusType.standard };
      const result = await service.findAll(query);

      expect(result.data).toEqual(mockBuses);
    });
  });

  describe('create', () => {
    it('should create a bus with seats', async () => {
      const dto = {
        licensePlate: '29A-12345',
        type: BusType.standard,
        totalSeats: 32,
      };

      const mockBus = {
        id: '1',
        ...dto,
      };

      mockPrismaService.buses.create.mockResolvedValue(mockBus);
      mockPrismaService.seats.createMany.mockResolvedValue({ count: 32 });

      const result = await service.create(dto, 'user1', '127.0.0.1', 'UA');

      expect(result.message).toContain('created successfully');
      expect(mockPrismaService.buses.create).toHaveBeenCalled();
      expect(mockPrismaService.seats.createMany).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid license plate', async () => {
      const dto = {
        licensePlate: 'INVALID',
        type: BusType.standard,
        totalSeats: 32,
      };

      await expect(
        service.create(dto, 'user1', '127.0.0.1', 'UA'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a bus', async () => {
      const mockBus = {
        id: '1',
        licensePlate: '29A-12345',
        type: BusType.standard,
      };

      const updateDto = {
        licensePlate: '29A-54321',
      };

      const updatedBus = {
        ...mockBus,
        ...updateDto,
      };

      mockPrismaService.buses.findUnique.mockResolvedValue(mockBus);
      mockPrismaService.buses.update.mockResolvedValue(updatedBus);

      const result = await service.update(
        '1',
        updateDto,
        'user1',
        '127.0.0.1',
        'UA',
      );

      expect(result.message).toContain('updated successfully');
      expect(mockPrismaService.buses.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when bus not found', async () => {
      mockPrismaService.buses.findUnique.mockResolvedValue(null);

      await expect(
        service.update('999', {}, 'user1', '127.0.0.1', 'UA'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a bus', async () => {
      const mockBus = { id: '1', licensePlate: '29A-12345' };

      mockPrismaService.buses.findUnique.mockResolvedValue(mockBus);
      mockPrismaService.buses.delete.mockResolvedValue(mockBus);

      const result = await service.remove('1', 'user1', '127.0.0.1', 'UA');

      expect(result.message).toContain('deleted successfully');
      expect(mockPrismaService.buses.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when bus not found', async () => {
      mockPrismaService.buses.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('999', 'user1', '127.0.0.1', 'UA'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
