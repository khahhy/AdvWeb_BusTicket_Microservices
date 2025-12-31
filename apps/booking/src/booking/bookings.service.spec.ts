import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '@app/shared';
import { BookingsGateway } from './bookings.gateway';
import { ETicketService } from '../eticket/eticket.service';
import { ClientProxy } from '@nestjs/microservices';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { of } from 'rxjs';
import { BookingStatus } from '@app/shared/enums';

describe('BookingsService', () => {
  let service: BookingsService;
  let prismaService: PrismaService;
  let cacheManager: RedisCacheService;
  let bookingsGateway: BookingsGateway;
  let eTicketService: ETicketService;
  let supportClient: ClientProxy;
  let identityClient: ClientProxy;
  let tripClient: ClientProxy;

  const mockPrismaService = {
    bookings: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockBookingsGateway = {
    emitBookingCreated: jest.fn(),
    emitBookingStatusUpdate: jest.fn(),
    emitSeatLocked: jest.fn(),
    emitSeatUnlocked: jest.fn(),
  };

  const mockETicketService = {
    generateETicketPDF: jest.fn(),
    getFullBookingData: jest.fn(),
  };

  const mockClientProxy = {
    send: jest.fn(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisCacheService,
          useValue: mockCacheManager,
        },
        {
          provide: BookingsGateway,
          useValue: mockBookingsGateway,
        },
        {
          provide: ETicketService,
          useValue: mockETicketService,
        },
        {
          provide: 'SUPPORT_SERVICE',
          useValue: mockClientProxy,
        },
        {
          provide: 'IDENTITY_SERVICE',
          useValue: mockClientProxy,
        },
        {
          provide: 'TRIP_SERVICE',
          useValue: mockClientProxy,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheManager = module.get<RedisCacheService>(RedisCacheService);
    bookingsGateway = module.get<BookingsGateway>(BookingsGateway);
    eTicketService = module.get<ETicketService>(ETicketService);
    supportClient = module.get<ClientProxy>('SUPPORT_SERVICE');
    identityClient = module.get<ClientProxy>('IDENTITY_SERVICE');
    tripClient = module.get<ClientProxy>('TRIP_SERVICE');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return a booking by id', async () => {
      const mockBooking = {
        id: '1',
        ticketCode: 'BK123456',
        userId: 'user1',
        status: BookingStatus.confirmed,
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);

      const result = await service.findOne('1');

      expect(result).toEqual({
        message: 'Booking retrieved successfully',
        data: mockBooking,
      });
      expect(mockPrismaService.bookings.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByUser', () => {
    it('should return all bookings for a user', async () => {
      const mockBookings = [
        { id: '1', userId: 'user1', ticketCode: 'BK123' },
        { id: '2', userId: 'user1', ticketCode: 'BK456' },
      ];

      mockPrismaService.bookings.findMany.mockResolvedValue(mockBookings);

      const result = await service.findAllByUser('user1');

      expect(result).toEqual({
        message: 'Bookings retrieved successfully',
        data: mockBookings,
      });
      expect(mockPrismaService.bookings.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findByTicketCode', () => {
    it('should return booking by ticket code and email', async () => {
      const mockBooking = {
        id: '1',
        ticketCode: 'BK123456',
        email: 'test@example.com',
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);

      const result = await service.findByTicketCode(
        'BK123456',
        'test@example.com',
      );

      expect(result).toEqual({
        message: 'Booking retrieved successfully',
        data: mockBooking,
      });
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(null);

      await expect(
        service.findByTicketCode('INVALID', 'test@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when email does not match', async () => {
      const mockBooking = {
        id: '1',
        ticketCode: 'BK123456',
        email: 'test@example.com',
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);

      await expect(
        service.findByTicketCode('BK123456', 'wrong@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated bookings', async () => {
      const mockBookings = [
        { id: '1', ticketCode: 'BK123' },
        { id: '2', ticketCode: 'BK456' },
      ];

      mockPrismaService.bookings.findMany.mockResolvedValue(mockBookings);
      mockPrismaService.bookings.count.mockResolvedValue(2);

      const query = { page: 1, limit: 10 };
      const result = await service.findAll(query);

      expect(result.data).toEqual(mockBookings);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('cancel', () => {
    it('should cancel a booking successfully', async () => {
      const mockBooking = {
        id: '1',
        userId: 'user1',
        status: BookingStatus.confirmed,
        ticketCode: 'BK123456',
        tripId: 'trip1',
        seatId: 'seat1',
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.bookings.update.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.cancelled,
      });
      mockClientProxy.send.mockReturnValue(
        of({ success: true, message: 'OK' }),
      );

      const result = await service.cancel('1', 'user1');

      expect(result.message).toContain('cancelled successfully');
      expect(mockPrismaService.bookings.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: BookingStatus.cancelled,
          cancelledAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(null);

      await expect(service.cancel('999', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when booking already cancelled', async () => {
      const mockBooking = {
        id: '1',
        userId: 'user1',
        status: BookingStatus.cancelled,
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);

      await expect(service.cancel('1', 'user1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
