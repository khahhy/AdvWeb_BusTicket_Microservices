import { ApiProperty } from '@nestjs/swagger';

export class PaymentStatusBookingItemDto {
  @ApiProperty({ example: 'booking-uuid' })
  bookingId: string;

  @ApiProperty({ example: 'BTB-9X2K3Q', required: false, nullable: true })
  ticketCode?: string | null;

  @ApiProperty({ example: 'A01', required: false, nullable: true })
  seatNumber?: string | null;

  @ApiProperty({ example: 250000 })
  price: number;
}

export class PaymentStatusResponseDto {
  @ApiProperty({ example: 'booking-uuid' })
  bookingId: string;

  @ApiProperty({ example: 'payment-uuid-123', required: false })
  paymentId?: string;

  @ApiProperty({ example: 'pending' })
  status: string;

  @ApiProperty({ example: 250000 })
  amount: number;

  @ApiProperty({ example: 'payos', required: false })
  gateway?: string;

  @ApiProperty({
    required: false,
    description: 'Raw gateway response for debugging',
  })
  paymentInfo?: unknown;

  @ApiProperty({ example: true, required: false })
  synced?: boolean;

  @ApiProperty({ example: 'error message', required: false })
  error?: string;

  // Fields only present in "status-by-order"
  @ApiProperty({ example: 'trip-uuid', required: false })
  tripId?: string;

  @ApiProperty({ example: 'route-uuid', required: false })
  routeId?: string;

  @ApiProperty({ example: 'BTB-9X2K3Q', required: false, nullable: true })
  ticketCode?: string | null;

  @ApiProperty({ example: 'A01, A02', required: false })
  seatNumber?: string;

  @ApiProperty({ example: 'Nguyen Van A', required: false })
  passengerName?: string;

  @ApiProperty({ example: 'a@b.com', required: false })
  email?: string;

  @ApiProperty({ example: '2025-12-29T01:00:00.000Z', required: false })
  travelDate?: string | Date;

  @ApiProperty({ example: 2, required: false })
  bookingCount?: number;

  @ApiProperty({ type: [PaymentStatusBookingItemDto], required: false })
  bookings?: PaymentStatusBookingItemDto[];
}
