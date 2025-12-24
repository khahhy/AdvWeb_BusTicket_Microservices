import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray } from 'class-validator';

export class BusAmenitiesSettingsDto {
  @ApiProperty({
    example: ['Wifi', 'USB Port', 'Blanket', 'Water', 'LCD Screen'],
    description: 'List of available amenities that can be assigned to buses',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  amenities: string[];
}
