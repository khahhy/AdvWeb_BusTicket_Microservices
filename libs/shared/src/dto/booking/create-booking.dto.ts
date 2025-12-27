import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerInfoDto } from './customer-info.dto';

export class CreateBookingDto {
  @ApiPropertyOptional({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Unique identifier of the user (optional for guest checkout)',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Unique identifier of the Trip',
  })
  @IsUUID()
  @IsNotEmpty()
  tripId: string;

  @ApiProperty({
    example: 'b1234567-89ab-cdef-0123-456789abcdef',
    description: 'Unique identifier of the Route',
  })
  @IsUUID()
  @IsNotEmpty()
  routeId: string;

  @ApiPropertyOptional({
    example: 'c2345678-90ab-cdef-1234-567890abcdef',
    description: 'Unique identifier of the Seat to book (for single seat)',
  })
  @IsUUID()
  @IsOptional()
  seatId?: string;

  @ApiPropertyOptional({
    example: ['c2345678-90ab-cdef-1234-567890abcdef'],
    description: 'Array of Seat IDs to book (for multiple seats)',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  seatIds?: string[];

  @ApiProperty({
    type: CustomerInfoDto,
    description: 'Cusotomer information',
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CustomerInfoDto)
  customerInfo: CustomerInfoDto;
}
