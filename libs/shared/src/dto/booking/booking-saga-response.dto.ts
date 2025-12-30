import { ApiProperty } from '@nestjs/swagger';
import { CreatePaymentLinkResponseDto } from '../payment/create-payment-link-response.dto';

export class BookingCreationDataDto {
  @ApiProperty({ example: 'booking-uuid' })
  bookingId!: string;

  @ApiProperty({ type: [String], example: ['booking-uuid'], required: false })
  bookingIds?: string[];

  @ApiProperty({ type: [String], example: ['TCKT-123456'], required: false })
  ticketCodes?: string[];

  @ApiProperty({ example: 1, required: false })
  seatCount?: number;

  @ApiProperty({ example: 150000, required: false })
  totalPrice?: number;

  @ApiProperty({ example: 'pendingPayment', required: false })
  status?: string;

  @ApiProperty({ example: '2025-01-01T10:15:00.000Z', required: false })
  expiresAt?: string | Date;
}

export class BookingSagaDataDto {
  @ApiProperty({ type: BookingCreationDataDto })
  booking!: BookingCreationDataDto;

  @ApiProperty({ type: CreatePaymentLinkResponseDto })
  payment!: CreatePaymentLinkResponseDto;
}

export class BookingSagaResponseDto {
  @ApiProperty({ example: 'Booking and payment orchestrated successfully' })
  message!: string;

  @ApiProperty({ type: BookingSagaDataDto })
  data!: BookingSagaDataDto;
}
