import { ApiProperty } from '@nestjs/swagger';

export class PayOSWebhookResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Payment processed successfully' })
  message: string;

  @ApiProperty({ example: 'booking-uuid', required: false })
  bookingId?: string;

  @ApiProperty({ example: 'successful', required: false })
  status?: 'successful' | 'failed' | 'pending';
}
