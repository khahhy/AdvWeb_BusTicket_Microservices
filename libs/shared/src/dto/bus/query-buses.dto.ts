import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsArray, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { BusType } from '@app/shared/enums';

export class QueryBusesDto {
  @ApiPropertyOptional({
    enum: BusType,
    description: 'Filter by bus type',
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(BusType, { each: true })
  busType?: BusType[];

  @ApiPropertyOptional({
    description: 'Filter by amenities (comma-separated)',
    example: 'wifi,airCondition,tv',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  amenities?: string[];
}
