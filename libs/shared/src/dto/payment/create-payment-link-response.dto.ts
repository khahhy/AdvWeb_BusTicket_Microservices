import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentLinkResponseDto {
  @ApiProperty({ example: 'payment-uuid-123' })
  paymentId: string;

  @ApiProperty({ example: 'https://pay.payos.vn/web/...' })
  checkoutUrl: string;

  @ApiProperty({
    example: 'https://img.vietqr.io/...',
    required: false,
    nullable: true,
  })
  qrCode?: string | null;

  @ApiProperty({ example: 123456789 })
  orderCode: number;

  @ApiProperty({ example: 250000 })
  amount: number;
}
