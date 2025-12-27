import { ApiProperty } from '@nestjs/swagger';

export class LocationDto {
  @ApiProperty({
    example: 'aa3251e6-8b41-4a75-b0d8-dc3b31c659c7',
    description: 'Unique identifier of the location (UUID)',
  })
  id: string;

  @ApiProperty({
    example: 'Mui Ne Station',
    description: 'Name of the bus station or pick-up point',
  })
  name: string;

  @ApiProperty({
    example: 'Nguyen Dinh Chieu, Ham Tien',
    description: 'Full address of the location',
  })
  address: string;

  @ApiProperty({
    example: 'Mui Ne',
    description: 'City or province name',
  })
  city: string;

  @ApiProperty({
    example: 10.95,
    description: 'Latitude coordinate',
    type: Number,
  })
  latitude: number;

  @ApiProperty({
    example: 108.2833,
    description: 'Longitude coordinate',
    type: Number,
  })
  longitude: number;

  @ApiProperty({
    example: '2025-12-16T11:27:01.428Z',
    description: 'Timestamp when the location was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-12-16T11:27:01.428Z',
    description: 'Timestamp when the location was last updated',
  })
  updatedAt: Date;
}
