import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerInfoDto } from './customer-info.dto';

export class ModifyBookingDto {
  @ApiProperty({
    description: 'New trip ID (if changing trip)',
    required: false,
    example: 'a1b2c3d4-5678-90ab-cdef-123456789abc',
  })
  @IsOptional()
  @IsUUID()
  tripId?: string;

  @ApiProperty({
    description: 'New seat ID (if changing seat)',
    required: false,
    example: 'e1f2g3h4-5678-90ab-cdef-123456789abc',
  })
  @IsOptional()
  @IsUUID()
  seatId?: string;

  @ApiProperty({
    description: 'New route ID (if changing route)',
    required: false,
    example: 'i1j2k3l4-5678-90ab-cdef-123456789abc',
  })
  @IsOptional()
  @IsUUID()
  routeId?: string;

  @ApiProperty({
    description: 'Updated customer information',
    required: false,
    type: CustomerInfoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerInfoDto)
  customerInfo?: CustomerInfoDto;
}
