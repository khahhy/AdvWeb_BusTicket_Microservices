import { ApiProperty } from '@nestjs/swagger';

export class SeatDto {
  @ApiProperty({
    example: '9bbf9340-3b0f-4066-8ccb-87a50b2711ab',
    description: 'Unique identifier of the seat',
  })
  id: string;

  @ApiProperty({
    example: '8de97157-f166-4461-ac12-d05799f1b542',
    description: 'ID of the bus this seat belongs to',
  })
  busId: string;

  @ApiProperty({
    example: 'D1',
    description: 'Seat number/label',
  })
  seatNumber: string;
}
