import { Test, TestingModule } from '@nestjs/testing';
import { BookingOrchestrator } from './booking-orchestrator.service';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { CreateBookingDto } from '@app/shared/dto';

describe('BookingOrchestrator', () => {
  let orchestrator: BookingOrchestrator;
  let bookingClient: ClientProxy;
  let paymentClient: ClientProxy;

  const mockBookingClient = {
    send: jest.fn(),
  };

  const mockPaymentClient = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingOrchestrator,
        {
          provide: 'BOOKING_SERVICE',
          useValue: mockBookingClient,
        },
        {
          provide: 'PAYMENT_SERVICE',
          useValue: mockPaymentClient,
        },
      ],
    }).compile();

    orchestrator = module.get<BookingOrchestrator>(BookingOrchestrator);
    bookingClient = module.get<ClientProxy>('BOOKING_SERVICE');
    paymentClient = module.get<ClientProxy>('PAYMENT_SERVICE');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBookingWithPayment - Happy Path', () => {
    it('should successfully create booking and payment', async () => {
      const createBookingDto: CreateBookingDto = {
        tripId: 'trip-123',
        routeId: 'route-123',
        seatIds: ['seat-1'],
        customerInfo: {
          fullName: 'Test User',
          email: 'test@example.com',
          phoneNumber: '0909123456',
          identificationCard: '123456789',
        },
      };

      const mockBookingResult = {
        data: {
          bookingId: 'booking-123',
          bookingIds: ['booking-123'],
          ticketCodes: ['TCKT-123'],
          ticketCode: 'TCKT-123',
          seatCount: 1,
          totalPrice: 150000,
          status: 'pendingPayment',
          expiresAt: new Date(),
        },
      };

      const mockPaymentResult = {
        data: {
          paymentId: 'payment-123',
          checkoutUrl: 'https://pay.example.com',
          orderCode: 123456,
          amount: 150000,
        },
      };

      mockBookingClient.send.mockReturnValueOnce(of(mockBookingResult));
      mockPaymentClient.send.mockReturnValueOnce(of(mockPaymentResult));

      const result = await orchestrator.createBookingWithPayment(
        createBookingDto,
      );

      expect(result.message).toBe(
        'Booking and payment orchestrated successfully',
      );
      expect(result.data.booking).toEqual(mockBookingResult.data);
      expect(result.data.payment).toEqual(mockPaymentResult.data);
      expect(mockBookingClient.send).toHaveBeenCalledWith(
        { cmd: 'create_booking' },
        createBookingDto,
      );
      expect(mockPaymentClient.send).toHaveBeenCalledWith(
        { cmd: 'create_payment_link' },
        expect.objectContaining({
          bookingId: 'booking-123',
          bookingIds: ['booking-123'],
          totalAmount: 150000,
        }),
      );
    });
  });

  describe('createBookingWithPayment - Compensation', () => {
    it('should cancel booking if payment creation fails', async () => {
      const createBookingDto: CreateBookingDto = {
        tripId: 'trip-123',
        routeId: 'route-123',
        seatIds: ['seat-1'],
        customerInfo: {
          fullName: 'Test User',
          email: 'test@example.com',
          phoneNumber: '0909123456',
          identificationCard: '123456789',
        },
      };

      const mockBookingResult = {
        data: {
          bookingId: 'booking-123',
          bookingIds: ['booking-123'],
          ticketCodes: ['TCKT-123'],
          ticketCode: 'TCKT-123',
          seatCount: 1,
          totalPrice: 150000,
          status: 'pendingPayment',
          expiresAt: new Date(),
        },
      };

      mockBookingClient.send.mockReturnValueOnce(of(mockBookingResult));
      mockPaymentClient.send.mockReturnValueOnce(
        throwError(() => new Error('Payment service unavailable')),
      );
      mockBookingClient.send.mockReturnValueOnce(
        of({ message: 'Booking cancelled' }),
      );

      await expect(
        orchestrator.createBookingWithPayment(createBookingDto),
      ).rejects.toThrow('Payment service unavailable');

      // Verify compensating transaction was called
      expect(mockBookingClient.send).toHaveBeenCalledWith(
        { cmd: 'cancel_booking' },
        { id: 'booking-123' },
      );
    });

    it('should log error if compensation fails', async () => {
      const createBookingDto: CreateBookingDto = {
        tripId: 'trip-123',
        routeId: 'route-123',
        seatIds: ['seat-1'],
        customerInfo: {
          fullName: 'Test User',
          email: 'test@example.com',
          phoneNumber: '0909123456',
          identificationCard: '123456789',
        },
      };

      const mockBookingResult = {
        data: {
          bookingId: 'booking-123',
          bookingIds: ['booking-123'],
          ticketCodes: ['TCKT-123'],
          ticketCode: 'TCKT-123',
          seatCount: 1,
          totalPrice: 150000,
          status: 'pendingPayment',
          expiresAt: new Date(),
        },
      };

      mockBookingClient.send.mockReturnValueOnce(of(mockBookingResult));
      mockPaymentClient.send.mockReturnValueOnce(
        throwError(() => new Error('Payment service unavailable')),
      );
      mockBookingClient.send.mockReturnValueOnce(
        throwError(() => new Error('Cancellation failed')),
      );

      const loggerErrorSpy = jest.spyOn(
        orchestrator['logger'],
        'error',
      );

      await expect(
        orchestrator.createBookingWithPayment(createBookingDto),
      ).rejects.toThrow('Payment service unavailable');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'COMPENSATING FAILED: Could not cancel booking booking-123',
        expect.any(Error),
      );
    });
  });

  describe('confirmBookingPayment', () => {
    it('should confirm bookings and send e-tickets', async () => {
      const bookingIds = ['booking-1', 'booking-2'];

      mockBookingClient.send
        .mockReturnValueOnce(of({ message: 'Bookings confirmed' }))
        .mockReturnValueOnce(
          of({
            data: {
              id: 'booking-1',
              ticketCode: 'TCKT-1',
            },
          }),
        )
        .mockReturnValueOnce(of({ message: 'E-ticket sent' }))
        .mockReturnValueOnce(
          of({
            data: {
              id: 'booking-2',
              ticketCode: 'TCKT-2',
            },
          }),
        )
        .mockReturnValueOnce(of({ message: 'E-ticket sent' }));

      const result = await orchestrator.confirmBookingPayment(bookingIds);

      expect(result.message).toBe(
        'Payment confirmation saga completed successfully',
      );
      expect(result.data.bookingIds).toEqual(bookingIds);
      expect(result.data.status).toBe('confirmed');
      expect(mockBookingClient.send).toHaveBeenCalledWith(
        { cmd: 'confirm_bookings_many' },
        { bookingIds },
      );
    });

    it('should continue if e-ticket sending fails', async () => {
      const bookingIds = ['booking-1'];

      mockBookingClient.send
        .mockReturnValueOnce(of({ message: 'Bookings confirmed' }))
        .mockReturnValueOnce(
          of({
            data: {
              id: 'booking-1',
              ticketCode: 'TCKT-1',
            },
          }),
        )
        .mockReturnValueOnce(
          throwError(() => new Error('Email service unavailable')),
        );

      const loggerWarnSpy = jest.spyOn(orchestrator['logger'], 'warn');

      const result = await orchestrator.confirmBookingPayment(bookingIds);

      expect(result.message).toBe(
        'Payment confirmation saga completed successfully',
      );
      expect(loggerWarnSpy).toHaveBeenCalled();
    });
  });

  describe('handlePaymentFailure', () => {
    it('should cancel all bookings on payment failure', async () => {
      const bookingIds = ['booking-1', 'booking-2'];
      const reason = 'Insufficient funds';

      mockBookingClient.send
        .mockReturnValueOnce(of({ message: 'Booking cancelled' }))
        .mockReturnValueOnce(of({ message: 'Booking cancelled' }));

      const result = await orchestrator.handlePaymentFailure(
        bookingIds,
        reason,
      );

      expect(result.message).toBe(
        'Payment failure handled, bookings cancelled',
      );
      expect(result.data.bookingIds).toEqual(bookingIds);
      expect(result.data.status).toBe('cancelled');
      expect(result.data.reason).toBe(reason);
      expect(mockBookingClient.send).toHaveBeenCalledTimes(2);
    });

    it('should continue cancelling other bookings if one fails', async () => {
      const bookingIds = ['booking-1', 'booking-2'];

      mockBookingClient.send
        .mockReturnValueOnce(
          throwError(() => new Error('Cancellation failed')),
        )
        .mockReturnValueOnce(of({ message: 'Booking cancelled' }));

      const loggerErrorSpy = jest.spyOn(
        orchestrator['logger'],
        'error',
      );

      const result = await orchestrator.handlePaymentFailure(bookingIds);

      expect(result.message).toBe(
        'Payment failure handled, bookings cancelled',
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to cancel booking booking-1',
        expect.any(Error),
      );
    });
  });
});
