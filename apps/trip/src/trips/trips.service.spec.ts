import { Test, TestingModule } from '@nestjs/testing';
import { TripsService } from './trips.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '@app/shared';
import { ClientProxy } from '@nestjs/microservices';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TripStatus } from '@app/shared/enums';

describe('TripsService', () => {
  let service: TripsService;
  let prismaService: PrismaService;
  let cacheManager: RedisCacheService;
  let supportClient: ClientProxy;
  let bookingClient: ClientProxy;

  const mockPrismaService = {
    trips: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    buses: {
      findUnique: jest.fn(),
    },
    locations: {
      findUnique: jest.fn(),
    },
    tripStops: {
      createMany: jest.fn(),
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
        TripsService,
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
        {
          provide: 'BOOKING_SERVICE',
          useValue: mockClientProxy,
        },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheManager = module.get<RedisCacheService>(RedisCacheService);
    supportClient = module.get<ClientProxy>('SUPPORT_SERVICE');
    bookingClient = module.get<ClientProxy>('BOOKING_SERVICE');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return a trip by id', async () => {
      const mockTrip = {
        id: '1',
        name: 'Hà Nội - Sài Gòn',
        status: TripStatus.scheduled,
      };

      mockPrismaService.trips.findUnique.mockResolvedValue(mockTrip);

      const result = await service.findOne('1');

      expect(result.data).toEqual(mockTrip);
      expect(mockPrismaService.trips.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when trip not found', async () => {
      mockPrismaService.trips.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated trips', async () => {
      const mockTrips = [
        { id: '1', name: 'Trip 1', status: TripStatus.scheduled },
        { id: '2', name: 'Trip 2', status: TripStatus.completed },
      ];

      mockPrismaService.trips.findMany.mockResolvedValue(mockTrips);
      mockPrismaService.trips.count.mockResolvedValue(2);

      const query = { page: 1, limit: 10 };
      const result = await service.findAll(query);

      expect(result.data).toEqual(mockTrips);
      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter trips by status', async () => {
      const mockTrips = [
        { id: '1', name: 'Trip 1', status: TripStatus.scheduled },
      ];

      mockPrismaService.trips.findMany.mockResolvedValue(mockTrips);
      mockPrismaService.trips.count.mockResolvedValue(1);

      const query = { page: 1, limit: 10, status: TripStatus.scheduled };
      const result = await service.findAll(query);

      expect(result.data).toEqual(mockTrips);
    });
  });

  describe('create', () => {
    it('should create a trip successfully', async () => {
      const dto = {
        busId: 'bus1',
        stops: [
          {
            locationId: 'loc1',
            arrivalTime: new Date('2024-01-01T08:00:00'),
            departureTime: new Date('2024-01-01T08:30:00'),
            stopOrder: 1,
          },
          {
            locationId: 'loc2',
            arrivalTime: new Date('2024-01-01T12:00:00'),
            departureTime: new Date('2024-01-01T12:30:00'),
            stopOrder: 2,
          },
        ],
      };

      const mockBus = { id: 'bus1', type: 'standard' };
      const mockLocation = { id: 'loc1', name: 'Location 1' };
      const mockTrip = { id: '1', busId: 'bus1' };

      mockPrismaService.buses.findUnique.mockResolvedValue(mockBus);
      mockPrismaService.locations.findUnique.mockResolvedValue(mockLocation);
      mockPrismaService.trips.create.mockResolvedValue(mockTrip);

      const result = await service.create(dto, 'user1', '127.0.0.1', 'UA');

      expect(result.message).toContain('created successfully');
      expect(mockPrismaService.trips.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when bus not found', async () => {
      const dto = {
        busId: 'invalid',
        stops: [],
      };

      mockPrismaService.buses.findUnique.mockResolvedValue(null);

      await expect(
        service.create(dto, 'user1', '127.0.0.1', 'UA'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when less than 2 stops', async () => {
      const dto = {
        busId: 'bus1',
        stops: [
          {
            locationId: 'loc1',
            arrivalTime: new Date(),
            departureTime: new Date(),
            stopOrder: 1,
          },
        ],
      };

      mockPrismaService.buses.findUnique.mockResolvedValue({ id: 'bus1' });

      await expect(
        service.create(dto, 'user1', '127.0.0.1', 'UA'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a trip', async () => {
      const mockTrip = {
        id: '1',
        name: 'Trip 1',
        status: TripStatus.scheduled,
      };

      const updateDto = {
        status: TripStatus.completed,
      };

      const updatedTrip = {
        ...mockTrip,
        ...updateDto,
      };

      mockPrismaService.trips.findUnique.mockResolvedValue(mockTrip);
      mockPrismaService.trips.update.mockResolvedValue(updatedTrip);

      const result = await service.update(
        '1',
        updateDto,
        'user1',
        '127.0.0.1',
        'UA',
      );

      expect(result.message).toContain('updated successfully');
      expect(mockPrismaService.trips.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when trip not found', async () => {
      mockPrismaService.trips.findUnique.mockResolvedValue(null);

      await expect(
        service.update('999', {}, 'user1', '127.0.0.1', 'UA'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a trip', async () => {
      const mockTrip = { id: '1', name: 'Trip 1' };

      mockPrismaService.trips.findUnique.mockResolvedValue(mockTrip);
      mockPrismaService.trips.delete.mockResolvedValue(mockTrip);

      const result = await service.remove('1', 'user1', '127.0.0.1', 'UA');

      expect(result.message).toContain('deleted successfully');
      expect(mockPrismaService.trips.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when trip not found', async () => {
      mockPrismaService.trips.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('999', 'user1', '127.0.0.1', 'UA'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
