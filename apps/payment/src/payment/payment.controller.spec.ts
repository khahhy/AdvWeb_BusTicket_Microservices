import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, PayOSWebhookDto } from '@app/shared/dto';

describe('PaymentController', () => {
  let controller: PaymentController;
  let service: PaymentService;

  const mockPaymentService = {
    createPaymentLink: jest.fn(),
    handlePayOSWebhook: jest.fn(),
    checkPaymentStatus: jest.fn(),
    checkPaymentStatusByOrderCode: jest.fn(),
    cancelPayment: jest.fn(),
    cancelWithRefund: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPaymentLink', () => {
    it('should create payment link', async () => {
      const dto: CreatePaymentDto = {
        bookingId: 'booking1',
        totalAmount: 100000,
        buyerName: 'John Doe',
        buyerEmail: 'john@example.com',
        buyerPhone: '1234567890',
      };

      const expectedResult = {
        message: 'Payment link created successfully',
        data: {
          checkoutUrl: 'https://payos.vn/checkout/123456',
          orderCode: 123456,
        },
      };

      mockPaymentService.createPaymentLink.mockResolvedValue(expectedResult);

      const result = await controller.createPaymentLink(dto);

      expect(result).toEqual(expectedResult);
      expect(service.createPaymentLink).toHaveBeenCalledWith(dto);
    });
  });

  describe('handlePayOSWebhook', () => {
    it('should handle PayOS webhook', async () => {
      const dto: PayOSWebhookDto = {
        code: '00',
        desc: 'Success',
        data: {
          orderCode: 123456,
          amount: 100000,
          description: 'Payment for booking',
          accountNumber: '1234567890',
          reference: 'REF123',
          transactionDateTime: '2024-01-01T00:00:00Z',
          paymentLinkId: 'link123',
        },
        signature: 'signature123',
      };

      const expectedResult = {
        message: 'Webhook processed successfully',
        data: { processed: true },
      };

      mockPaymentService.handlePayOSWebhook.mockResolvedValue(expectedResult);

      const result = await controller.handlePayOSWebhook(dto);

      expect(result).toEqual(expectedResult);
      expect(service.handlePayOSWebhook).toHaveBeenCalledWith(dto);
    });
  });

  describe('checkPaymentStatus', () => {
    it('should check payment status by booking ID', async () => {
      const bookingId = 'booking1';
      const expectedResult = {
        message: 'Payment status retrieved successfully',
        data: {
          id: 'payment1',
          bookingId: 'booking1',
          status: 'paid',
        },
      };

      mockPaymentService.checkPaymentStatus.mockResolvedValue(expectedResult);

      const result = await controller.checkPaymentStatus(bookingId);

      expect(result).toEqual(expectedResult);
      expect(service.checkPaymentStatus).toHaveBeenCalledWith(bookingId);
    });
  });

  describe('checkPaymentStatusByOrderCode', () => {
    it('should check payment status by order code', async () => {
      const orderCode = 123456;
      const expectedResult = {
        message: 'Payment status retrieved successfully',
        data: {
          id: 'payment1',
          orderCode: 123456,
          status: 'paid',
        },
      };

      mockPaymentService.checkPaymentStatusByOrderCode.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.checkPaymentStatusByOrderCode(orderCode);

      expect(result).toEqual(expectedResult);
      expect(service.checkPaymentStatusByOrderCode).toHaveBeenCalledWith(
        orderCode,
      );
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment', async () => {
      const payload = {
        bookingId: 'booking1',
        reason: 'User requested cancellation',
      };

      const expectedResult = {
        message: 'Payment cancelled successfully',
        data: { cancelled: true },
      };

      mockPaymentService.cancelPayment.mockResolvedValue(expectedResult);

      const result = await controller.cancelPayment(payload);

      expect(result).toEqual(expectedResult);
      expect(service.cancelPayment).toHaveBeenCalledWith(
        payload.bookingId,
        payload.reason,
      );
    });
  });

  describe('cancelWithRefund', () => {
    it('should cancel payment with refund', async () => {
      const payload = {
        bookingId: 'booking1',
        userId: 'user1',
        reason: 'Trip cancelled',
      };

      const expectedResult = {
        message: 'Payment cancelled and refund initiated',
        data: { refunded: true },
      };

      mockPaymentService.cancelWithRefund.mockResolvedValue(expectedResult);

      const result = await controller.cancelWithRefund(payload);

      expect(result).toEqual(expectedResult);
      expect(service.cancelWithRefund).toHaveBeenCalledWith(
        payload.bookingId,
        payload.userId,
        payload.reason,
      );
    });
  });
});
