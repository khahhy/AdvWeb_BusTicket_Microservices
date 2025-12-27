import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsArray,
  IsNumber,
} from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'ID của booking (primary booking for single seat)',
    example: 'booking-uuid-123',
  })
  @IsNotEmpty()
  @IsString()
  bookingId: string;

  @ApiPropertyOptional({
    description: 'Array of all booking IDs (for multiple seats)',
    example: ['booking-uuid-123', 'booking-uuid-456'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bookingIds?: string[];

  @ApiPropertyOptional({
    description: 'Total amount to charge (for multiple seats)',
    example: 500000,
  })
  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @ApiProperty({
    description: 'Tên người mua (tùy chọn)',
    example: 'Nguyễn Văn A',
    required: false,
  })
  @IsOptional()
  @IsString()
  buyerName?: string;

  @ApiProperty({
    description: 'Email người mua (tùy chọn)',
    example: 'nguyenvana@gmail.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  buyerEmail?: string;

  @ApiProperty({
    description: 'Số điện thoại người mua (tùy chọn)',
    example: '0987654321',
    required: false,
  })
  @IsOptional()
  @IsString()
  buyerPhone?: string;
}
