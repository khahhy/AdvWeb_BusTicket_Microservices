import { TripStatus } from '@prisma/client-trip';
import {
  IsOptional,
  IsEnum,
  IsBooleanString,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TripQueryDto {
  @ApiPropertyOptional({
    description: 'Filter trips starting after this timestamp',
    example: '2025-11-21T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Filter trips ending before this timestamp',
    example: '2025-11-21T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    description:
      'Filter trips that contain this location as a stop (origin). If both origin and destination are provided, origin must appear before destination.',
    example: 'loc_123',
  })
  @IsOptional()
  origin?: string;

  @ApiPropertyOptional({
    description:
      'Filter trips that contain this location as a stop (destination). If both origin and destination are provided, destination must appear after origin.',
    example: 'loc_456',
  })
  @IsOptional()
  destination?: string;

  @ApiPropertyOptional({
    description: 'Bus ID to filter trips',
    example: 'bus_001',
  })
  @IsOptional()
  busId?: string;

  @ApiPropertyOptional({
    description: 'Trip status to filter',
    enum: TripStatus,
    example: TripStatus.scheduled,
  })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @ApiPropertyOptional({
    description: 'Include trip stops in the response',
    example: 'true',
  })
  @IsOptional()
  @IsBooleanString()
  includeStops?: string;

  @ApiPropertyOptional({
    description: 'Include trip segments in the response',
    example: 'true',
  })
  @IsOptional()
  @IsBooleanString()
  includeSegments?: string;
}
