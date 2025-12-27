import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { PayOSService } from '../payos/payos.service';
import { CreatePaymentDto, PayOSWebhookDto } from '@app/shared/dto';
import { PaymentStatus, GatewayType } from '@app/shared/enums';
import { PaymentGateway } from './payment.gateway';
import { Prisma } from '@prisma/client-payment';
import { firstValueFrom } from 'rxjs';
import { BaseResponse } from '@app/shared';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payosService: PayOSService,
    private readonly paymentGateway: PaymentGateway,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    @Inject('SUPPORT_SERVICE') private readonly supportClient: ClientProxy,
  ) {}

  private async getBookingDetails(bookingId: string) {
    try {
      const res = await firstValueFrom(
        this.bookingClient.send<BaseResponse<any>>(
          { cmd: 'find_one_booking' },
          bookingId,
        ),
      );
      return res.data;
    } catch (e) {
      this.logger.error(`Failed to fetch booking ${bookingId}`, e);
      throw new NotFoundException('Booking không tồn tại hoặc lỗi kết nối');
    }
  }

  async createPaymentLink(createPaymentDto: CreatePaymentDto) {
    const {
      bookingId,
      bookingIds,
      totalAmount,
      buyerName,
      buyerEmail,
      buyerPhone,
    } = createPaymentDto;

    const targetBookingId = bookingId || (bookingIds && bookingIds[0]);
    const booking = await this.getBookingDetails(targetBookingId);

    if (booking.status === 'confirmed') {
      throw new BadRequestException('Booking đã được thanh toán');
    }
    if (booking.status === 'cancelled') {
      throw new BadRequestException('Booking đã bị hủy');
    }

    const amount = totalAmount || Number(booking.price);
    const orderCode = this.generateOrderCode(targetBookingId);

    const customerInfo = booking.customerInfo || {};
    const finalBuyerName =
      buyerName ||
      booking.user?.fullName ||
      customerInfo.fullName ||
      'Khách hàng';
    const finalBuyerEmail =
      buyerEmail || booking.user?.email || customerInfo.email || '';
    const finalBuyerPhone =
      buyerPhone || booking.user?.phoneNumber || customerInfo.phoneNumber || '';

    const description = `Thanh toan ve ${booking.ticketCode}`.substring(0, 25);

    const payment = await this.prisma.payments.create({
      data: {
        bookingId: targetBookingId,
        amount: new Prisma.Decimal(amount),
        gateway: GatewayType.payos,
        orderCode: BigInt(orderCode),
        status: PaymentStatus.pending,
        metadata:
          bookingIds && bookingIds.length > 1
            ? { relatedBookingIds: bookingIds }
            : undefined,
      },
    });

    try {
      const paymentLink = await this.payosService.createPaymentLink({
        orderCode,
        amount,
        description,
        buyerName: finalBuyerName,
        buyerEmail: finalBuyerEmail,
        buyerPhone: finalBuyerPhone,
        items: [{ name: description, quantity: 1, price: amount }],
      });

      const linkData = paymentLink as any;
      await this.prisma.payments.update({
        where: { id: payment.id },
        data: {
          gatewayTransactionId:
            linkData.paymentLinkId || linkData.id || 'unknown',
        },
      });

      return {
        paymentId: payment.id,
        checkoutUrl: linkData.checkoutUrl || linkData.checkout_url || '',
        qrCode: linkData.qrCode || linkData.qr_code,
        orderCode: linkData.orderCode || linkData.order_code || orderCode,
        amount: linkData.amount || amount,
      };
    } catch (error) {
      await this.prisma.payments.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.failed },
      });
      throw error;
    }
  }

  async handlePayOSWebhook(webhookData: PayOSWebhookDto) {
    try {
      const { code, data: paymentData } = webhookData;
      if (!paymentData?.orderCode)
        throw new BadRequestException('Invalid webhook data');

      const payment = await this.prisma.payments.findUnique({
        where: { orderCode: BigInt(paymentData.orderCode) } as any,
      });

      if (!payment) throw new NotFoundException('Payment record not found');
      if (payment.status === PaymentStatus.successful) {
        return { success: true, message: 'Already processed' };
      }

      const isSuccess = code === '00';
      const newStatus = isSuccess
        ? PaymentStatus.successful
        : PaymentStatus.failed;

      await this.prisma.payments.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          gatewayTransactionId: paymentData.paymentLinkId,
        },
      });

      if (isSuccess) {
        const metadata = payment.metadata as {
          relatedBookingIds?: string[];
        } | null;
        const bookingIds = metadata?.relatedBookingIds || [payment.bookingId];

        this.bookingClient.emit('payment_success', {
          bookingIds,
          paymentId: payment.id,
        });

        this.supportClient.emit('payment_success_notification', {
          bookingIds,
          amount: paymentData.amount,
          customerEmail: null,
        });

        this.paymentGateway.emitPaymentSuccess(payment.bookingId, {
          ticketCode: 'Processing...',
          amount: paymentData.amount,
          bookingIds,
        });
      } else {
        this.paymentGateway.emitPaymentFailure(payment.bookingId, {
          reason: webhookData.desc || 'Payment failed',
        });
      }

      return { success: true, status: newStatus };
    } catch (error) {
      this.logger.error('Webhook processing error', error);
      throw error;
    }
  }

  async cancelWithRefund(bookingId: string, userId: string, reason?: string) {
    let refundCalc;
    try {
      const res = await firstValueFrom(
        this.bookingClient.send<BaseResponse<any>>(
          { cmd: 'check_refund_eligibility' },
          { bookingId, userId },
        ),
      );
      refundCalc = res.data;
    } catch (e: any) {
      throw new BadRequestException(
        e.message || 'Refund eligibility check failed',
      );
    }

    const payment = await this.prisma.payments.findFirst({
      where: { bookingId, status: PaymentStatus.successful },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment)
      throw new BadRequestException('No successful payment found to refund');

    await this.prisma.payments.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.refunded,
        refundedAmount: refundCalc.refundAmount,
        refundedAt: new Date(),
        refundReason: reason || 'User requested cancellation',
      },
    });

    this.bookingClient.emit('booking_refunded', { bookingId });

    this.supportClient.emit('refund_notification', {
      bookingId,
      refundInfo: refundCalc,
    });

    return {
      success: true,
      message: 'Refund processed successfully',
      data: {
        bookingId,
        refundAmount: refundCalc.refundAmount,
        status: 'refunded',
      },
    };
  }

  private generateOrderCode(bookingId: string): number {
    const timestamp = Math.floor(Date.now() / 100);
    const hash =
      bookingId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      1000;
    return timestamp * 1000 + hash;
  }

  async cancelPayment(bookingId: string, reason?: string) {
    const payment = await this.prisma.payments.findFirst({
      where: { bookingId, status: PaymentStatus.pending },
    });
    if (!payment) throw new NotFoundException('No pending payment found');

    if (payment.orderCode) {
      try {
        await this.payosService.cancelPaymentLink(
          Number(payment.orderCode),
          reason,
        );
      } catch (e) {
        this.logger.warn('PayOS cancel link failed', e);
      }
    }

    await this.prisma.payments.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.failed },
    });

    return { success: true };
  }
}
