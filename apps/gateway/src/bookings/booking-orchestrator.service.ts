import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  CreateBookingDto,
  CreatePaymentDto,
  BookingCreationDataDto,
  CreatePaymentLinkResponseDto,
  BookingSagaResponseDto,
} from '@app/shared/dto';
import { BaseResponse } from '@app/shared';
import { BookingStatus } from '@app/shared/enums';

/**
 * Saga Orchestrator for Booking Flow
 *
 * This service orchestrates the distributed transaction for creating a booking and payment.
 * Pattern: Orchestration-based Saga
 *
 * Flow:
 * 1. Create Booking (Booking Service) -> pendingPayment status
 * 2. Create Payment Link (Payment Service) -> payment link URL
 * 3. If any step fails, execute compensating transactions
 *
 * Compensating Actions:
 * - If payment creation fails: Cancel the booking
 */
@Injectable()
export class BookingOrchestrator {
  private readonly logger = new Logger(BookingOrchestrator.name);

  constructor(
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
  ) {}

  /**
   * Orchestrates the booking creation saga
   * Step 1: Create booking with pendingPayment status
   * Step 2: Create payment link
   * If Step 2 fails, compensate by cancelling the booking
   */
  async createBookingWithPayment(
    createBookingDto: CreateBookingDto,
  ): Promise<BookingSagaResponseDto> {
    this.logger.log('Starting Booking Saga Orchestration');

    let bookingResult: BookingCreationDataDto | null = null;

    try {
      // STEP 1: Create Booking
      this.logger.log('Step 1: Creating booking...');
      const bookingResponse = await firstValueFrom(
        this.bookingClient.send<BaseResponse<BookingCreationDataDto>>(
          { cmd: 'create_booking' },
          createBookingDto,
        ),
      );

      if (!bookingResponse?.data) {
        throw new Error('Booking creation failed: No data returned');
      }

      bookingResult = bookingResponse.data;
      this.logger.log(
        `Step 1 SUCCESS: Booking created with ID ${bookingResult.bookingId}, status: ${bookingResult.status}`,
      );

      // STEP 2: Create Payment Link
      this.logger.log('Step 2: Creating payment link...');
      const paymentDto: CreatePaymentDto = {
        bookingId: bookingResult.bookingId,
        bookingIds: bookingResult.bookingIds,
        totalAmount: bookingResult.totalPrice,
        buyerName: createBookingDto.customerInfo.fullName,
        buyerEmail: createBookingDto.customerInfo.email,
        buyerPhone: createBookingDto.customerInfo.phoneNumber,
      };

      const paymentResponse = await firstValueFrom(
        this.paymentClient.send<BaseResponse<CreatePaymentLinkResponseDto>>(
          { cmd: 'create_payment_link' },
          paymentDto,
        ),
      );

      if (!paymentResponse?.data) {
        throw new Error('Payment creation failed: No data returned');
      }

      const paymentResult = paymentResponse.data;
      this.logger.log(
        `Step 2 SUCCESS: Payment link created with order code ${paymentResult.orderCode}`,
      );

      // SUCCESS: Return combined result
      return {
        message: 'Booking and payment orchestrated successfully',
        data: {
          booking: bookingResult,
          payment: paymentResult,
        },
      };
    } catch (error) {
      this.logger.error(
        'Saga failed, executing compensating transaction',
        error,
      );

      // COMPENSATING TRANSACTION: Cancel booking if it was created
      if (bookingResult) {
        await this.compensateCancelBooking(bookingResult.bookingId);
      }

      throw error;
    }
  }

  /**
   * Compensating transaction: Cancel a booking
   * Used when payment creation fails after booking was created
   */
  private async compensateCancelBooking(bookingId: string): Promise<void> {
    try {
      this.logger.warn(
        `COMPENSATING: Cancelling booking ${bookingId} due to saga failure`,
      );

      await firstValueFrom(
        this.bookingClient.send({ cmd: 'cancel_booking' }, { id: bookingId }),
      );

      this.logger.log(`COMPENSATING SUCCESS: Booking ${bookingId} cancelled`);
    } catch (compensationError) {
      this.logger.error(
        `COMPENSATING FAILED: Could not cancel booking ${bookingId}`,
        compensationError,
      );
      // In production, this should trigger an alert or manual intervention
      // Could also be logged to a dead-letter queue for retry
    }
  }

  /**
   * Saga for confirming payment
   * This is typically called by webhook handler after payment succeeds
   * Step 1: Confirm booking status
   * Step 2: Send e-ticket
   */
  async confirmBookingPayment(bookingIds: string[]) {
    this.logger.log(
      `Starting Payment Confirmation Saga for bookings: ${bookingIds.join(', ')}`,
    );

    try {
      // STEP 1: Confirm bookings
      this.logger.log('Step 1: Confirming bookings...');
      await firstValueFrom(
        this.bookingClient.send(
          { cmd: 'confirm_bookings_many' },
          { bookingIds },
        ),
      );
      this.logger.log(`Step 1 SUCCESS: Bookings confirmed`);

      // STEP 2: Send e-tickets (for each booking)
      this.logger.log('Step 2: Sending e-tickets...');
      for (const bookingId of bookingIds) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const bookingData = await firstValueFrom(
            this.bookingClient.send({ cmd: 'find_one_booking' }, bookingId),
          );

          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (bookingData?.data?.ticketCode) {
            await firstValueFrom(
              this.bookingClient.send(
                { cmd: 'send_eticket_email' },
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                bookingData.data.ticketCode,
              ),
            );
          }
        } catch (emailError) {
          this.logger.warn(
            `Failed to send e-ticket for booking ${bookingId}`,
            emailError,
          );
          // Don't fail the saga if email sending fails
        }
      }

      this.logger.log('Step 2 SUCCESS: E-tickets sent');

      return {
        message: 'Payment confirmation saga completed successfully',
        data: { bookingIds, status: BookingStatus.confirmed },
      };
    } catch (error) {
      this.logger.error('Payment confirmation saga failed', error);
      throw error;
    }
  }

  /**
   * Saga for payment failure
   * Step 1: Mark payment as failed
   * Step 2: Cancel bookings (compensating action)
   */
  async handlePaymentFailure(bookingIds: string[], reason?: string) {
    this.logger.log(
      `Starting Payment Failure Saga for bookings: ${bookingIds.join(', ')}`,
    );

    try {
      // Cancel all related bookings
      for (const bookingId of bookingIds) {
        try {
          await firstValueFrom(
            this.bookingClient.send(
              { cmd: 'cancel_booking' },
              { id: bookingId },
            ),
          );
          this.logger.log(
            `Booking ${bookingId} cancelled due to payment failure`,
          );
        } catch (cancelError) {
          this.logger.error(
            `Failed to cancel booking ${bookingId}`,
            cancelError,
          );
        }
      }

      return {
        message: 'Payment failure handled, bookings cancelled',
        data: { bookingIds, status: BookingStatus.cancelled, reason },
      };
    } catch (error) {
      this.logger.error('Payment failure saga failed', error);
      throw error;
    }
  }
}
