import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, PayOSWebhookDto } from '@app/shared/dto';

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @MessagePattern({ cmd: 'create_payment_link' })
  async createPaymentLink(@Payload() dto: CreatePaymentDto) {
    return this.paymentService.createPaymentLink(dto);
  }

  @MessagePattern({ cmd: 'handle_payos_webhook' })
  async handleWebhook(@Payload() dto: PayOSWebhookDto) {
    return this.paymentService.handlePayOSWebhook(dto);
  }

  @MessagePattern({ cmd: 'cancel_payment' })
  async cancelPayment(@Payload() p: { bookingId: string; reason?: string }) {
    return this.paymentService.cancelPayment(p.bookingId, p.reason);
  }

  @MessagePattern({ cmd: 'refund_payment' })
  async refundPayment(
    @Payload() p: { bookingId: string; userId: string; reason?: string },
  ) {
    return this.paymentService.cancelWithRefund(
      p.bookingId,
      p.userId,
      p.reason,
    );
  }
}
