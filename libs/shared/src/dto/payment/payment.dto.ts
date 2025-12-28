import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { PaymentStatus, GatewayType } from '@app/shared/enums';

export class PaymentDto {
  @ApiProperty({ example: 'uuid-v4-string' })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty({ example: 'booking-uuid' })
  @IsNotEmpty()
  @IsString()
  bookingId: string;

  @ApiProperty({ example: 150000 })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({
    example: 'momo',
    enum: GatewayType,
    required: false,
  })
  @IsOptional()
  @IsEnum(GatewayType)
  gateway?: GatewayType;

  @ApiProperty({
    example: 'MOMO_123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  gatewayTransactionId?: string;

  @ApiProperty({
    example: 'successful',
    enum: PaymentStatus,
  })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiProperty({
    example: { rawResponse: {} },
    required: false,
  })
  @IsOptional()
  metadata?: unknown;

  @ApiProperty({
    example: 123456789,
    required: false,
  })
  @IsOptional()
  orderCode?: number;

  @ApiProperty({
    example: 50000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  refundedAmount?: number;

  @ApiProperty({
    example: '2025-01-01T10:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  refundedAt?: Date;

  @ApiProperty({
    example: 'Customer requested refund',
    required: false,
  })
  @IsOptional()
  @IsString()
  refundReason?: string;

  @ApiProperty({ example: '2025-01-01T09:00:00Z' })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ example: '2025-01-01T09:10:00Z' })
  @IsDateString()
  updatedAt: Date;
}
