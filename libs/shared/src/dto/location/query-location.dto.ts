import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryLocationDto {
  @ApiPropertyOptional({
    description: 'Filter locations by city name',
    example: 'Hà Nội',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description:
      'Search by location name or keyword. Matches partial text, case-insensitive.',
    example: 'Bến xe',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
