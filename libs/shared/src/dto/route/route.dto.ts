import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationDto } from '../location';

class SimpleTripDto {
  @ApiProperty({ example: 'd782b924-5385-4948-ac08-55dd126a10b4' })
  id: string;

  @ApiProperty({ example: 'bd7ee1ec-f75b-449a-9ebd-601c66578b2f' })
  busId: string;

  @ApiProperty({ example: 'HCMC-Mui Ne Morning' })
  tripName: string;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty({ example: 'scheduled' })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

class RouteTripEntryDto {
  @ApiProperty({ example: 'd782b924-5385-4948-ac08-55dd126a10b4' })
  tripId: string;

  @ApiProperty({ example: '02c78036-acee-48b0-b502-671ef7e203b2' })
  routeId: string;

  @ApiProperty({ example: '150000' })
  price: string;

  @ApiProperty({ type: () => SimpleTripDto })
  trip: SimpleTripDto;
}

export class RouteDto {
  @ApiProperty({ example: '02c78036-acee-48b0-b502-671ef7e203b2' })
  id: string;

  @ApiProperty({ example: '5aee360d-d279-48e2-8e95-106024cb6f82' })
  originLocationId: string;

  @ApiProperty({ example: 'aa3251e6-8b41-4a75-b0d8-dc3b31c659c7' })
  destinationLocationId: string;

  @ApiProperty({ example: 'Ho Chi Minh - Mui Ne' })
  name: string;

  @ApiProperty({ example: 'Route from Ho Chi Minh City to Mui Ne' })
  description: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: () => LocationDto })
  origin: LocationDto;

  @ApiProperty({ type: () => LocationDto })
  destination: LocationDto;

  @ApiPropertyOptional({
    type: () => [RouteTripEntryDto],
    description:
      'List of trips associated with this route (Available in Detail View)',
  })
  tripRoutes?: RouteTripEntryDto[];
}

export class TopPerformingRouteDto {
  @ApiProperty({ example: '02c78036-acee-48b0-b502-671ef7e203b2' })
  routeId: string;

  @ApiProperty({ example: 'Ho Chi Minh - Mui Ne' })
  routeName: string;

  @ApiProperty({ example: 'Ho Chi Minh City' })
  origin: string;

  @ApiProperty({ example: 'Mui Ne' })
  destination: string;

  @ApiProperty({ example: 22 })
  totalBookings: number;

  @ApiProperty({
    example: '3600000',
    description: 'Total revenue as string to avoid overflow',
  })
  totalRevenue: string;
}
