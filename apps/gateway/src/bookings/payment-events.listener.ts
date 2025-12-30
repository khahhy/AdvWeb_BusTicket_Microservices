import { Injectable, Logger } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { BookingOrchestrator } from '../bookings/booking-orchestrator.service';

/**
 * Event Listener for Payment Service Events
 * Handles asynchronous events from payment service and triggers saga orchestration
 */
@Injectable()
export class PaymentEventsListener {
  private readonly logger = new Logger(PaymentEventsListener.name);

  constructor(private readonly bookingOrchestrator: BookingOrchestrator) {}

  /**
   * Handles successful payment events
   * Triggers booking confirmation saga
   */
  @EventPattern('payment.success')
  async handlePaymentSuccess(data: {
    bookingId: string;
    bookingIds: string[];
    amount: number;
    orderCode: number;
  }) {
    this.logger.log(
      `Received payment.success event for bookings: ${data.bookingIds?.join(', ') || data.bookingId}`,
    );

    try {
      const bookingIds = data.bookingIds?.length
        ? data.bookingIds
        : [data.bookingId];

      await this.bookingOrchestrator.confirmBookingPayment(bookingIds);
      this.logger.log('Payment success saga completed');
    } catch (error) {
      this.logger.error('Failed to handle payment success event', error);
    }
  }

  /**
   * Handles failed payment events
   * Triggers booking cancellation saga
   */
  @EventPattern('payment.failed')
  async handlePaymentFailure(data: {
    bookingId: string;
    bookingIds?: string[];
    reason?: string;
  }) {
    this.logger.log(
      `Received payment.failed event for bookings: ${data.bookingIds?.join(', ') || data.bookingId}`,
    );

    try {
      const bookingIds = data.bookingIds?.length
        ? data.bookingIds
        : [data.bookingId];

      await this.bookingOrchestrator.handlePaymentFailure(
        bookingIds,
        data.reason,
      );
      this.logger.log('Payment failure saga completed');
    } catch (error) {
      this.logger.error('Failed to handle payment failure event', error);
    }
  }
}
