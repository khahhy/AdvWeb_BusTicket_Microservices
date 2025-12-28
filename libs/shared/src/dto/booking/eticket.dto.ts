import { ApiProperty } from '@nestjs/swagger';

export class FullETicketDataDto {
  @ApiProperty({ example: 'BTB-9X2K3Q' })
  bookingCode: string;

  @ApiProperty({ example: 'Bocchi' })
  passengerName: string;

  @ApiProperty({ example: '012345678901' })
  passengerId: string;

  @ApiProperty({ example: 'bocchi@gmail.com' })
  email: string;

  @ApiProperty({ example: '0909123456' })
  phone: string;

  @ApiProperty({ example: 'Hồ Chí Minh' })
  tripFrom: string;

  @ApiProperty({ example: 'Đà Lạt' })
  tripTo: string;

  @ApiProperty({ example: 'Bến xe Miền Đông' })
  fromTerminal: string;

  @ApiProperty({ example: 'Bến xe Đà Lạt' })
  toTerminal: string;

  @ApiProperty({ example: '06:30 AM' })
  departureTime: string;

  @ApiProperty({ example: '11:30 AM' })
  arrivalTime: string;

  @ApiProperty({ example: '2025-12-29' })
  travelDate: string;

  @ApiProperty({ example: '5h 0m' })
  duration: string;

  @ApiProperty({ example: 'A01' })
  seatNumber: string;

  @ApiProperty({ example: 'limousine' })
  busType: string;

  @ApiProperty({ example: '51A-22222' })
  licensePlate: string;

  @ApiProperty({ example: 250000 })
  ticketPrice: number;

  @ApiProperty({ example: 250000 })
  totalPrice: number;

  @ApiProperty({ example: '2025-12-28' })
  bookingDate: string;

  @ApiProperty({
    example: 'CONFIRMED',
    enum: ['CONFIRMED', 'PENDING', 'CANCELLED'],
  })
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
}

export class FullETicketResponseDto {
  @ApiProperty({ example: 'Fetched e-ticket data successfully' })
  message: string;

  @ApiProperty({ type: FullETicketDataDto })
  data: FullETicketDataDto;
}
