import { ApiProperty } from '@nestjs/swagger';

export class RefundPaymentDataDto {
  @ApiProperty({ example: 'booking-uuid' })
  bookingId: string;

  @ApiProperty({ example: 200000 })
  refundAmount: number;

  @ApiProperty({ example: 85 })
  refundPercentage: number;

  @ApiProperty({ example: 'refunded' })
  status: string;
}

export class RefundPaymentResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    example:
      'Ticket cancellation successful. Refund request has been acknowledged and will be processed within 24 business hours.',
  })
  message: string;

  @ApiProperty({ type: RefundPaymentDataDto })
  data: RefundPaymentDataDto;
}
