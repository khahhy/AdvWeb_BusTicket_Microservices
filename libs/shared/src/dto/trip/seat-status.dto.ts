import { ApiProperty } from '@nestjs/swagger';

export class SeatStatusDto {
  @ApiProperty()
  seatId: string;

  @ApiProperty()
  seatNumber: string;

  @ApiProperty({ enum: ['AVAILABLE', 'BOOKED', 'LOCKED'] })
  status: string;
}
