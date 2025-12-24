import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class GetRouteTripsDto {
  @ApiProperty({
    required: false,
    description: 'Filter trips departing after this date (ISO-8601)',
    example: '2024-11-22T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    required: false,
    description: 'Filter trips departing before this date (ISO-8601)',
    example: '2024-11-23T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
