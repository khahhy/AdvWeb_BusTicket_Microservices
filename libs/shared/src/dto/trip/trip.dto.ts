import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusDto, LocationDto } from '@app/shared/dto';

export class RouteDetailsDto {
  @ApiProperty({ example: '195d3c9d-a834-4029-8f99-e93da67c5de2' })
  id: string;

  @ApiProperty({ example: 'Ho Chi Minh - Can Tho' })
  name: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ type: () => LocationDto })
  origin: LocationDto;

  @ApiProperty({ type: () => LocationDto })
  destination: LocationDto;
}

export class TripRouteDto {
  @ApiProperty({ example: 'e07791da-ad2a-41d2-a1c4-ed92184d5d72' })
  tripId: string;

  @ApiProperty({ example: '195d3c9d-a834-4029-8f99-e93da67c5de2' })
  routeId: string;

  @ApiProperty({
    example: '186173',
    description: 'Price for this specific route segment',
  })
  price: string;

  @ApiProperty({ type: () => RouteDetailsDto })
  route: RouteDetailsDto;
}

export class TripStopDetailDto {
  @ApiProperty({ example: 'e86f0052-4066-4fbd-b826-19720a667022' })
  id: string;

  @ApiProperty({ example: 1, description: 'Order sequence of the stop' })
  sequence: number;

  @ApiPropertyOptional({
    example: null,
    description: 'Arrival time at this stop',
  })
  arrivalTime: Date | null;

  @ApiPropertyOptional({
    example: '2025-12-07T11:04:00.000Z',
    description: 'Departure time from this stop',
  })
  departureTime: Date | null;

  @ApiProperty({ type: () => LocationDto })
  location: LocationDto;
}

export class TripSegmentDto {
  @ApiProperty({ example: '51ea2dde-26e9-4980-8bef-5123c67c61df' })
  id: string;

  @ApiProperty({ example: 'e86f0052-4066-4fbd-b826-19720a667022' })
  fromStopId: string;

  @ApiProperty({ example: '153075d0-965f-4fad-9edf-5af9453b422d' })
  toStopId: string;

  @ApiProperty({ example: 1 })
  segmentIndex: number;

  @ApiProperty({ example: 96, description: 'Duration in minutes' })
  durationMinutes: number;
}

export class TripDto {
  @ApiProperty({ example: 'e07791da-ad2a-41d2-a1c4-ed92184d5d72' })
  id: string;

  @ApiProperty({ example: 'Ho Chi Minh - Ca Mau' })
  tripName: string;

  @ApiProperty({ example: '2025-12-07T11:04:00.000Z' })
  startTime: Date;

  @ApiProperty({ example: '2025-12-07T15:30:00.000Z' })
  endTime: Date;

  @ApiProperty({
    example: 'completed',
    enum: ['scheduled', 'cancelled', 'completed'],
  })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: () => BusDto })
  bus: BusDto;

  @ApiProperty({ type: () => [TripStopDetailDto] })
  tripStops: TripStopDetailDto[];

  @ApiProperty({ type: () => [TripSegmentDto] })
  segments: TripSegmentDto[];

  @ApiPropertyOptional({
    type: () => [TripRouteDto],
    description: 'Available only when includeRoutes query is true',
  })
  tripRoutes?: TripRouteDto[];

  @ApiPropertyOptional({
    description: 'Specific route name for search results',
  })
  routeName?: string;

  @ApiPropertyOptional({ description: 'Origin stop for search context' })
  originStop?: TripStopDetailDto;

  @ApiPropertyOptional({ description: 'Destination stop for search context' })
  destinationStop?: TripStopDetailDto;
}
