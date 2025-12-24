import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  IsEnum,
  IsArray,
  IsString,
  IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { BusType } from '@prisma/client-trip';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryTripRouteMapDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by Trip ID' })
  @IsOptional()
  @IsUUID()
  tripId?: string;

  @ApiPropertyOptional({ description: 'Filter by Route ID' })
  @IsOptional()
  @IsUUID()
  routeId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Route Name (partial match)',
    example: 'Ho Chi Minh City - Đà Lạt',
  })
  @IsOptional()
  @IsString()
  routeName?: string;

  @ApiPropertyOptional({
    description: 'Filter by Location (Origin OR Destination)',
  })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Origin Location ID',
  })
  @IsOptional()
  @IsUUID()
  originLocationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Destination Location ID',
  })
  @IsOptional()
  @IsUUID()
  destinationLocationId?: string;

  @ApiPropertyOptional({ description: 'Minimum price filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Minimum travel duration in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minDuration?: number;

  @ApiPropertyOptional({ description: 'Maximum travel duration in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDuration?: number;

  @ApiPropertyOptional({ description: 'Sort by Price', enum: SortOrder })
  @IsOptional()
  @IsEnum(SortOrder)
  sortByPrice?: SortOrder;

  @ApiPropertyOptional({ description: 'Sort by Duration', enum: SortOrder })
  @IsOptional()
  @IsEnum(SortOrder)
  sortByDuration?: SortOrder;

  // Advanced filtering options
  @ApiPropertyOptional({
    description: 'Filter by departure date',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  departureDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by departure time start (HH:mm)',
    example: '06:00',
  })
  @IsOptional()
  @IsString()
  departureTimeStart?: string;

  @ApiPropertyOptional({
    description: 'Filter by departure time end (HH:mm)',
    example: '22:00',
  })
  @IsOptional()
  @IsString()
  departureTimeEnd?: string;

  @ApiPropertyOptional({
    enum: BusType,
    description: 'Filter by bus type (crtl + click with swagger)',
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value as BusType[];
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim()) as BusType[];
    }
    return [value] as BusType[];
  })
  @IsArray()
  @IsEnum(BusType, { each: true })
  busType?: BusType[];

  @ApiPropertyOptional({
    description: 'Filter by amenities (comma-separated)',
    example: 'wifi,airCondition,tv',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value as string[];
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim());
    }
    return [String(value)];
  })
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
}
