import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { PayOSService } from '../payos/payos.service';
import { PaymentGateway } from './payment.gateway';
import { ClientProxy } from '@nestjs/microservices';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { of } from 'rxjs';
import { PaymentStatus, BookingStatus } from '@app/shared/enums';

describe('PaymentService', () => {
  let service: PaymentService;
  let prismaService: PrismaService;
  let payosService: PayOSService;
  let paymentGateway: PaymentGateway;
  let identityClient: ClientProxy;
  let tripClient: ClientProxy;
  let bookingClient: ClientProxy;
  let supportClient: ClientProxy;

  const mockPrismaService = {
    payments: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPayOSService = {
    createPaymentLink: jest.fn(),
    verifyWebhookData: jest.fn(),
    getPaymentLinkInfo: jest.fn(),
    cancelPaymentLink: jest.fn(),
  };

  const mockPaymentGateway = {
    emitPaymentCreated: jest.fn(),
    emitPaymentStatusUpdate: jest.fn(),
  };

  const mockClientProxy = {
    send: jest.fn(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PayOSService,
          useValue: mockPayOSService,
        },
        {
          provide: PaymentGateway,
          useValue: mockPaymentGateway,
        },
        {
          provide: 'IDENTITY_SERVICE',
          useValue: mockClientProxy,
        },
        {
          provide: 'TRIP_SERVICE',
          useValue: mockClientProxy,
        },
        {
          provide: 'BOOKING_SERVICE',
          useValue: mockClientProxy,
        },
        {
          provide: 'SUPPORT_SERVICE',
          useValue: mockClientProxy,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prismaService = module.get<PrismaService>(PrismaService);
    payosService = module.get<PayOSService>(PayOSService);
    paymentGateway = module.get<PaymentGateway>(PaymentGateway);
    identityClient = module.get<ClientProxy>('IDENTITY_SERVICE');
    tripClient = module.get<ClientProxy>('TRIP_SERVICE');
    bookingClient = module.get<ClientProxy>('BOOKING_SERVICE');
    supportClient = module.get<ClientProxy>('SUPPORT_SERVICE');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentLink', () => {
    it('should create payment link successfully', async () => {
      const dto = {
        bookingId: 'booking1',
        totalAmount: 100000,
        buyerName: 'John Doe',
        buyerEmail: 'john@example.com',
        buyerPhone: '1234567890',
      };

      const mockBooking = {
        id: 'booking1',
        status: BookingStatus.pending,
        price: 100000,
        user: { fullName: 'John Doe', email: 'john@example.com' },
        seat: { seatNumber: 'A1' },
        customerInfo: {},
      };

      const mockPayment = {
        id: 'payment1',
        bookingId: 'booking1',
        amount: 100000,
        orderCode: BigInt(123456),
        status: PaymentStatus.pending,
      };

      const mockPaymentLink = {
        checkoutUrl: 'https://payos.vn/checkout/123456',
        orderCode: 123456,
      };

      mockClientProxy.send.mockReturnValue(
        of({ success: true, data: mockBooking }),
      );
      mockPrismaService.payments.create.mockResolvedValue(mockPayment);
      mockPayOSService.createPaymentLink.mockResolvedValue(mockPaymentLink);

      const result = await service.createPaymentLink(dto);

      expect(result.message).toContain('created successfully');
      expect(result.data).toBeDefined();
      expect(mockPrismaService.payments.create).toHaveBeenCalled();
      expect(mockPayOSService.createPaymentLink).toHaveBeenCalled();
    });

    it('should throw BadRequestException when booking already confirmed', async () => {
      const dto = {
        bookingId: 'booking1',
        totalAmount: 100000,
        buyerName: 'John Doe',
        buyerEmail: 'john@example.com',
        buyerPhone: '1234567890',
      };

      const mockBooking = {
        id: 'booking1',
        status: BookingStatus.confirmed,
      };

      mockClientProxy.send.mockReturnValue(
        of({ success: true, data: mockBooking }),
      );

      await expect(service.createPaymentLink(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when booking cancelled', async () => {
      const dto = {
        bookingId: 'booking1',
        totalAmount: 100000,
        buyerName: 'John Doe',
        buyerEmail: 'john@example.com',
        buyerPhone: '1234567890',
      };

      const mockBooking = {
        id: 'booking1',
        status: BookingStatus.cancelled,
      };

      mockClientProxy.send.mockReturnValue(
        of({ success: true, data: mockBooking }),
      );

      await expect(service.createPaymentLink(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when booking not found', async () => {
      const dto = {
        bookingId: 'booking999',
        totalAmount: 100000,
        buyerName: 'John Doe',
        buyerEmail: 'john@example.com',
        buyerPhone: '1234567890',
      };

      mockClientProxy.send.mockReturnValue(of({ success: true, data: null }));

      await expect(service.createPaymentLink(dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('checkPaymentStatus', () => {
    it('should return payment status', async () => {
      const mockPayment = {
        id: 'payment1',
        bookingId: 'booking1',
        status: PaymentStatus.paid,
        amount: 100000,
      };

      mockPrismaService.payments.findFirst.mockResolvedValue(mockPayment);

      const result = await service.checkPaymentStatus('booking1');

      expect(result.message).toBe('Payment status retrieved successfully');
      expect(result.data).toEqual(mockPayment);
    });

    it('should throw NotFoundException when payment not found', async () => {
      mockPrismaService.payments.findFirst.mockResolvedValue(null);

      await expect(service.checkPaymentStatus('booking999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment successfully', async () => {
      const mockPayment = {
        id: 'payment1',
        bookingId: 'booking1',
        orderCode: BigInt(123456),
        status: PaymentStatus.pending,
      };

      const updatedPayment = {
        ...mockPayment,
        status: PaymentStatus.cancelled,
      };

      mockPrismaService.payments.findFirst.mockResolvedValue(mockPayment);
      mockPrismaService.payments.update.mockResolvedValue(updatedPayment);
      mockPayOSService.cancelPaymentLink.mockResolvedValue({ success: true });

      const result = await service.cancelPayment('booking1');

      expect(result.message).toContain('cancelled');
      expect(mockPrismaService.payments.update).toHaveBeenCalled();
      expect(mockPayOSService.cancelPaymentLink).toHaveBeenCalled();
    });

    it('should throw NotFoundException when payment not found', async () => {
      mockPrismaService.payments.findFirst.mockResolvedValue(null);

      await expect(service.cancelPayment('booking999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
