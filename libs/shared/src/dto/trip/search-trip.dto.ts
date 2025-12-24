import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class SearchTripDto {
  @ApiProperty({
    description:
      'Origin city name (e.g., "HCMC", "Hà Nội"). Will find all locations in this city.',
    example: 'HCMC',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  originCity?: string;

  @ApiProperty({
    description:
      'Destination city name (e.g., "Đà Nẵng", "Cần Thơ"). Will find all locations in this city.',
    example: 'Đà Nẵng',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  destinationCity?: string;

  @ApiProperty({
    description:
      'Departure date (YYYY-MM-DD format). Will search trips that depart on this date.',
    example: '2024-12-15',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  departureDate?: string;

  @ApiProperty({
    description: 'Include detailed trip stops information',
    example: 'true',
    required: false,
    default: 'false',
  })
  @IsOptional()
  @IsString()
  includeStops?: string;

  @ApiProperty({
    description: 'Include route information',
    example: 'true',
    required: false,
    default: 'false',
  })
  @IsOptional()
  @IsString()
  includeRoutes?: string;
}
