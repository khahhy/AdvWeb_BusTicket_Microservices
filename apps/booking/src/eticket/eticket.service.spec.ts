import { Test, TestingModule } from '@nestjs/testing';
import { ETicketService } from './eticket.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClientProxy } from '@nestjs/microservices';
import { NotFoundException } from '@nestjs/common';
import { of } from 'rxjs';

describe('ETicketService', () => {
  let service: ETicketService;
  let prismaService: PrismaService;
  let tripClient: ClientProxy;

  const mockPrismaService = {
    bookings: {
      findUnique: jest.fn(),
    },
  };

  const mockClientProxy = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ETicketService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: 'TRIP_SERVICE',
          useValue: mockClientProxy,
        },
      ],
    }).compile();

    service = module.get<ETicketService>(ETicketService);
    prismaService = module.get<PrismaService>(PrismaService);
    tripClient = module.get<ClientProxy>('TRIP_SERVICE');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFullBookingData', () => {
    it('should return full booking data successfully', async () => {
      const mockBooking = {
        id: 'booking1',
        ticketCode: 'BK123456',
        passengerName: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '1234567890',
        tripId: 'trip1',
        routeId: 'route1',
        seatId: 'seat1',
        pickupStopId: 'stop1',
        dropoffStopId: 'stop2',
        totalPrice: 100000,
        status: 'CONFIRMED',
        createdAt: new Date(),
      };

      const mockTrip = {
        id: 'trip1',
        name: 'Hà Nội - Sài Gòn',
        departureTime: '2024-01-01T08:00:00Z',
        arrivalTime: '2024-01-01T20:00:00Z',
        busPlate: '29A-12345',
        busType: 'Giường nằm',
        tripStops: [
          { id: 'stop1', locationName: 'Bến xe Mỹ Đình' },
          { id: 'stop2', locationName: 'Bến xe Miền Đông' },
        ],
      };

      const mockRoute = {
        id: 'route1',
        origin: { name: 'Hà Nội' },
        destination: { name: 'Sài Gòn' },
      };

      const mockSeat = {
        id: 'seat1',
        seatNumber: 'A1',
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);
      mockClientProxy.send
        .mockReturnValueOnce(of({ success: true, data: mockTrip }))
        .mockReturnValueOnce(of({ success: true, data: mockRoute }))
        .mockReturnValueOnce(of({ success: true, data: mockSeat }));

      const result = await service.getFullBookingData('BK123456');

      expect(result.message).toBe('Booking data retrieved successfully');
      expect(result.data).toBeDefined();
      expect(result.data.bookingCode).toBe('BK123456');
      expect(result.data.passengerName).toBe('John Doe');
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(null);

      await expect(service.getFullBookingData('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when trip not found', async () => {
      const mockBooking = {
        id: 'booking1',
        ticketCode: 'BK123456',
        tripId: 'trip1',
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);
      mockClientProxy.send.mockReturnValueOnce(
        of({ success: true, data: null }),
      );

      await expect(service.getFullBookingData('BK123456')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generatePDF', () => {
    it('should generate PDF buffer', async () => {
      const mockBooking = {
        id: 'booking1',
        ticketCode: 'BK123456',
        passengerName: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '1234567890',
        tripId: 'trip1',
        routeId: 'route1',
        seatId: 'seat1',
        pickupStopId: 'stop1',
        dropoffStopId: 'stop2',
        totalPrice: 100000,
        status: 'CONFIRMED',
        createdAt: new Date(),
        userId: 'user1',
        passengerId: '123456789',
        updatedAt: new Date(),
      };

      const mockTrip = {
        id: 'trip1',
        name: 'Hà Nội - Sài Gòn',
        departureTime: '2024-01-01T08:00:00Z',
        arrivalTime: '2024-01-01T20:00:00Z',
        busPlate: '29A-12345',
        busType: 'Giường nằm',
        tripStops: [
          { id: 'stop1', locationName: 'Bến xe Mỹ Đình' },
          { id: 'stop2', locationName: 'Bến xe Miền Đông' },
        ],
      };

      const mockRoute = {
        id: 'route1',
        origin: { name: 'Hà Nội' },
        destination: { name: 'Sài Gòn' },
      };

      const mockSeat = {
        id: 'seat1',
        seatNumber: 'A1',
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);
      mockClientProxy.send
        .mockReturnValueOnce(of({ success: true, data: mockTrip }))
        .mockReturnValueOnce(of({ success: true, data: mockRoute }))
        .mockReturnValueOnce(of({ success: true, data: mockSeat }));

      const result = await service.generatePDF('BK123456');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
