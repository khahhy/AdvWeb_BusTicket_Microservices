import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsArray, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { BusType } from '@app/shared/enums';

export class QueryBusesDto {
  @ApiPropertyOptional({
    enum: BusType,
    description: 'Filter by bus type',
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    return (Array.isArray(value) ? value : [value]) as BusType[];
  })
  @IsArray()
  @IsEnum(BusType, { each: true })
  busType?: BusType[];

  @ApiPropertyOptional({
    description: 'Filter by amenities (comma-separated)',
    example: 'wifi,tv',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;

    if (typeof value === 'string' && value.includes(',')) {
      return value.split(',');
    }
    return (Array.isArray(value) ? value : [value]) as string[];
  })
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
}
