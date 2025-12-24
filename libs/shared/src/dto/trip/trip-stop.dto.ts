import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsNotEmpty } from 'class-validator';

export class TripStopDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID()
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({ example: '2025-11-20T08:00:00Z' })
  @IsDateString()
  arrivalTime: string;

  @ApiProperty({ example: '2025-11-20T08:15:00Z' })
  @IsDateString()
  departureTime: string;
}
