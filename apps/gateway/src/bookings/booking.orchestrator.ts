import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { BaseResponse } from '@app/shared';
import {
  CreateBookingDto,
  CreatePaymentDto,
  CreatePaymentLinkResponseDto,
  BookingCreationDataDto,
  BookingSagaResponseDto,
} from '@app/shared/dto';

@Injectable()
export class BookingSagaOrchestrator {
  private readonly logger = new Logger(BookingSagaOrchestrator.name);

  constructor(
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
  ) {}

  async createBookingAndPayment(
    dto: CreateBookingDto,
  ): Promise<BookingSagaResponseDto> {
    const bookingRes = await firstValueFrom(
      this.bookingClient.send<BaseResponse<BookingCreationDataDto>>(
        { cmd: 'create_booking' },
        dto,
      ),
    );

    const bookingData = bookingRes?.data;
    if (!bookingData?.bookingId) {
      throw new InternalServerErrorException(
        'Booking service returned an invalid payload',
      );
    }

    const paymentPayload: CreatePaymentDto = {
      bookingId: bookingData.bookingId,
      bookingIds: bookingData.bookingIds,
      totalAmount: bookingData.totalPrice,
      buyerName: dto.customerInfo?.fullName,
      buyerEmail: dto.customerInfo?.email,
      buyerPhone: dto.customerInfo?.phoneNumber,
    };

    try {
      const paymentRes = await firstValueFrom(
        this.paymentClient.send<BaseResponse<CreatePaymentLinkResponseDto>>(
          { cmd: 'create_payment_link' },
          paymentPayload,
        ),
      );

      if (!paymentRes?.data) {
        throw new InternalServerErrorException(
          'Payment service returned an invalid payload',
        );
      }

      return {
        message: 'Booking and payment orchestrated successfully',
        data: {
          booking: bookingData,
          payment: paymentRes.data,
        },
      };
    } catch (error) {
      await this.compensateBookings(bookingData);
      this.logger.error('Payment step failed; bookings compensated', error);
      throw error;
    }
  }

  private async compensateBookings(bookingData: BookingCreationDataDto) {
    const ids = bookingData.bookingIds?.length
      ? bookingData.bookingIds
      : [bookingData.bookingId];

    for (const id of ids) {
      try {
        await firstValueFrom(
          this.bookingClient.send<BaseResponse<unknown>>(
            { cmd: 'cancel_booking' },
            { id },
          ),
        );
      } catch (cancelError) {
        this.logger.warn(
          `Compensation failed for booking ${id}: ${String(cancelError)}`,
        );
      }
    }
  }
}
