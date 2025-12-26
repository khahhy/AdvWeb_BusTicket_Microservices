import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
import { BusType } from '@app/shared/enums';

export class CreateBusDto {
  @ApiProperty({
    example: '51B-12345',
    description: 'Plate number, unique',
  })
  @IsNotEmpty()
  plate: string;

  @ApiPropertyOptional({
    enum: BusType,
    example: BusType.standard,
    description: 'Type of bus',
  })
  @IsOptional()
  @IsEnum(BusType)
  busType?: BusType;

  @ApiPropertyOptional({
    example: {
      wifi: true,
      water: true,
      tv: false,
      airCondition: true,
      toilet: false,
      blanket: true,
      snack: false,
      entertainment: true,
      usb: true,
      reclining: false,
    },
    description: 'Bus amenities',
  })
  @IsOptional()
  amenities?: Record<string, any>;
}
