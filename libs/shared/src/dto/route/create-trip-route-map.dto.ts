import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateTripRouteMapDto {
  @ApiProperty({
    description: 'ID of the trip',
    example: 'uuid-of-trip',
  })
  @IsNotEmpty()
  @IsUUID()
  tripId: string;

  @ApiProperty({
    description: 'ID of the route',
    example: 'uuid-of-route',
  })
  @IsNotEmpty()
  @IsUUID()
  routeId: string;

  @ApiProperty({
    description: 'Optional: Manually override the calculated price',
    required: false,
    example: 250000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  manualPrice?: number;
}
