import { ApiProperty } from '@nestjs/swagger';
import { BusType } from '@app/shared/enums';

export class BusDto {
  @ApiProperty({
    example: '8de97157-f166-4461-ac12-d05799f1b542',
    description: 'Unique identifier of the bus',
  })
  id: string;

  @ApiProperty({
    example: '51A-22222',
    description: 'License plate number',
  })
  plate: string;

  @ApiProperty({
    description:
      'Dynamic amenities object based on system settings. Keys are amenity codes, values are booleans.',
    example: {
      wifi: true,
      water: true,
      blanket: false,
      usb: true,
    },
    type: 'object',
    additionalProperties: {
      type: 'boolean',
    },
  })
  amenities: Record<string, boolean>;

  @ApiProperty({
    enum: BusType,
    example: 'limousine',
    description: 'Type of the bus (standard, vip, limousine, sleeper)',
  })
  busType: string;

  @ApiProperty({
    example: 1.2,
    description: 'Price multiplier factor based on bus type',
  })
  priceFactor: number;

  @ApiProperty({
    example: '2025-12-16T11:27:02.178Z',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-12-16T11:27:02.178Z',
  })
  updatedAt: Date;
}
