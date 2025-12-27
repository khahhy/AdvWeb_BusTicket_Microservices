import { ApiProperty } from '@nestjs/swagger';
import { BusDto } from '../bus';

export class TripRouteMapDetailDto {
  @ApiProperty({ example: '469a1a5f-62df-4f93-803e-f9b6e619c867' })
  tripId: string;

  @ApiProperty({ example: '02c78036-acee-48b0-b502-671ef7e203b2' })
  routeId: string;

  @ApiProperty({ example: '350000', description: 'Price in VND' })
  price: string;

  @ApiProperty({ example: 'HCMC-Mui Ne Limousine' })
  tripName: string;

  @ApiProperty({ example: '2025-12-17T09:00:00.000Z' })
  startTime: Date;

  @ApiProperty({ example: '2025-12-17T13:30:00.000Z' })
  endTime: Date;

  @ApiProperty({ example: 'scheduled' })
  status: string;

  @ApiProperty({ type: () => BusDto })
  bus: BusDto;

  @ApiProperty({ example: 'Ho Chi Minh - Mui Ne' })
  routeName: string;

  @ApiProperty({ example: 'Ho Chi Minh City Central Station' })
  origin: string;

  @ApiProperty({ example: 'Ho Chi Minh City' })
  originCity: string;

  @ApiProperty({ example: 'Mui Ne Station' })
  destination: string;

  @ApiProperty({ example: 'Mui Ne' })
  destinationCity: string;
}
