import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class TripCapacityDto {
  @ApiProperty({
    example: 'uuid-v4-string',
    description: 'Unique identifier of the trip capacity',
  })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty({
    example: 40,
    description: 'Total number of seats for the trip',
  })
  @IsNotEmpty()
  @IsNumber()
  seatCount: number;
}
