import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, PayOSWebhookDto } from '@app/shared/dto';

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * For Gateway: POST /payments/create-link
   * Pattern: send({ cmd: 'create_payment_link' }, dto)
   */
  @MessagePattern({ cmd: 'create_payment_link' })
  async createPaymentLink(@Payload() dto: CreatePaymentDto) {
    return this.paymentService.createPaymentLink(dto);
  }

  /**
   * Webhook from PayOS (or Gateway forwards webhook body)
   * Pattern: send({ cmd: 'payos_webhook' }, webhookBody)
   */
  @MessagePattern({ cmd: 'payos_webhook' })
  async handlePayOSWebhook(@Payload() dto: PayOSWebhookDto) {
    return this.paymentService.handlePayOSWebhook(dto);
  }

  /**
   * For Gateway: GET /payments/status/:bookingId
   * Pattern: send({ cmd: 'check_payment_status' }, bookingId)
   */
  @MessagePattern({ cmd: 'check_payment_status' })
  async checkPaymentStatus(@Payload() bookingId: string) {
    return this.paymentService.checkPaymentStatus(bookingId);
  }

  /**
   * For Gateway: GET /payments/status-by-order/:orderCode
   * Pattern: send({ cmd: 'check_payment_status_by_order_code' }, orderCode)
   */
  @MessagePattern({ cmd: 'check_payment_status_by_order_code' })
  async checkPaymentStatusByOrderCode(@Payload() orderCode: number) {
    return this.paymentService.checkPaymentStatusByOrderCode(orderCode);
  }

  /**
   * For Gateway: POST /payments/cancel
   * Pattern: send({ cmd: 'cancel_payment' }, { bookingId, reason? })
   */
  @MessagePattern({ cmd: 'cancel_payment' })
  async cancelPayment(@Payload() p: { bookingId: string; reason?: string }) {
    return this.paymentService.cancelPayment(p.bookingId, p.reason);
  }

  /**
   * For Gateway: POST /payments/cancel-refund
   * Pattern: send({ cmd: 'cancel_with_refund' }, { bookingId, userId, reason? })
   */
  @MessagePattern({ cmd: 'cancel_with_refund' })
  async cancelWithRefund(
    @Payload() p: { bookingId: string; userId: string; reason?: string },
  ) {
    return this.paymentService.cancelWithRefund(
      p.bookingId,
      p.userId,
      p.reason,
    );
  }
}
