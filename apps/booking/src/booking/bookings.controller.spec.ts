import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, QueryBookingDto } from '@app/shared/dto';

describe('BookingsController', () => {
  let controller: BookingsController;
  let service: BookingsService;

  const mockBookingsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findAllByUser: jest.fn(),
    findByGuestInfo: jest.fn(),
    findByTicketCode: jest.fn(),
    lockSeat: jest.fn(),
    unlockSeat: jest.fn(),
    cancel: jest.fn(),
    cancelByTicketCode: jest.fn(),
    modify: jest.fn(),
    countBookingsByTrip: jest.fn(),
    getSeatStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        {
          provide: BookingsService,
          useValue: mockBookingsService,
        },
      ],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
    service = module.get<BookingsService>(BookingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a booking', async () => {
      const dto: CreateBookingDto = {
        tripId: 'trip1',
        routeId: 'route1',
        seatId: 'seat1',
        userId: 'user1',
        customerInfo: {
          fullName: 'John Doe',
          email: 'john@example.com',
          phoneNumber: '1234567890',
          identificationCard: '079123456789',
        },
      };

      const expectedResult = {
        message: 'Booking created successfully',
        data: { id: '1', ...dto },
      };

      mockBookingsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(dto);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated bookings', async () => {
      const query: QueryBookingDto = { page: 1, limit: 10 };
      const expectedResult = {
        message: 'Bookings retrieved successfully',
        data: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };

      mockBookingsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should return a booking by id', async () => {
      const expectedResult = {
        message: 'Booking retrieved successfully',
        data: { id: '1', ticketCode: 'BK123' },
      };

      mockBookingsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne('1');

      expect(result).toEqual(expectedResult);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('findAllByUser', () => {
    it('should return all bookings for a user', async () => {
      const expectedResult = {
        message: 'Bookings retrieved successfully',
        data: [{ id: '1', userId: 'user1' }],
      };

      mockBookingsService.findAllByUser.mockResolvedValue(expectedResult);

      const result = await controller.findAllByUser('user1');

      expect(result).toEqual(expectedResult);
      expect(service.findAllByUser).toHaveBeenCalledWith('user1');
    });
  });

  describe('lockSeat', () => {
    it('should lock a seat', async () => {
      const payload = {
        userId: 'user1',
        tripId: 'trip1',
        seatId: 'seat1',
        routeId: 'route1',
      };

      const expectedResult = { message: 'Seat locked successfully' };
      mockBookingsService.lockSeat.mockResolvedValue(expectedResult);

      const result = await controller.lockSeat(payload);

      expect(result).toEqual(expectedResult);
      expect(service.lockSeat).toHaveBeenCalledWith(
        'user1',
        'trip1',
        'seat1',
        'route1',
      );
    });
  });

  describe('unlockSeat', () => {
    it('should unlock a seat', async () => {
      const payload = {
        userId: 'user1',
        tripId: 'trip1',
        seatId: 'seat1',
        routeId: 'route1',
      };

      const expectedResult = { message: 'Seat unlocked successfully' };
      mockBookingsService.unlockSeat.mockResolvedValue(expectedResult);

      const result = await controller.unlockSeat(payload);

      expect(result).toEqual(expectedResult);
      expect(service.unlockSeat).toHaveBeenCalledWith(
        'user1',
        'trip1',
        'seat1',
        'route1',
      );
    });
  });

  describe('cancelBooking', () => {
    it('should cancel a booking', async () => {
      const payload = { id: '1', userId: 'user1' };
      const expectedResult = { message: 'Booking cancelled successfully' };

      mockBookingsService.cancel.mockResolvedValue(expectedResult);

      const result = await controller.cancelBooking(payload);

      expect(result).toEqual(expectedResult);
      expect(service.cancel).toHaveBeenCalledWith('1', 'user1');
    });
  });
});
