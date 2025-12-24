import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsUUID,
  IsIP,
} from 'class-validator';

export class CreateActivityLogDto {
  @ApiPropertyOptional({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'ID of the user performing the action (null if system action)',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    example: 'UPDATE_BUS_PRICE',
    description: 'The action performed',
  })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiPropertyOptional({
    example: 'b1234567-89ab-cdef-0123-456789abcdef',
    description: 'ID of the target entity (e.g., Bus ID, Booking ID)',
  })
  @IsUUID()
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({
    example: 'Buses',
    description: 'Table name of the target entity',
  })
  @IsString()
  @IsOptional()
  entityType?: string;

  @ApiPropertyOptional({
    example: { oldPrice: 200000, newPrice: 250000, reason: 'Holiday' },
    description: 'Details of the change (JSON format)',
  })
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({
    example: '192.168.1.1',
    description: 'IP Address of the client',
  })
  @IsIP()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional({
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
    description: 'User Agent string',
  })
  @IsString()
  @IsOptional()
  userAgent?: string;
}
