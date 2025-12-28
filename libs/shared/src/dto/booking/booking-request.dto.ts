import { ApiProperty } from '@nestjs/swagger';

export class LockSeatRequestDto {
  @ApiProperty({ example: 'trip-uuid', description: 'Trip id' })
  tripId: string;

  @ApiProperty({ example: 'seat-uuid', description: 'Seat id' })
  seatId: string;

  @ApiProperty({ example: 'route-uuid', description: 'Route id' })
  routeId: string;
}

export class UnlockSeatRequestDto extends LockSeatRequestDto {}

export class GuestLookupRequestDto {
  @ApiProperty({ example: 'guest@example.com' })
  email: string;

  @ApiProperty({ example: '0909123456' })
  phoneNumber: string;
}

export class TicketCodeLookupQueryDto {
  @ApiProperty({ example: 'guest@example.com' })
  email: string;
}

export class CancelByTicketCodeRequestDto {
  @ApiProperty({ example: 'guest@example.com' })
  email: string;
}

export class ModifyBookingRequestDto {
  @ApiProperty({ required: false, example: 'trip-uuid' })
  tripId?: string;

  @ApiProperty({ required: false, example: 'seat-uuid' })
  seatId?: string;

  @ApiProperty({ required: false, example: 'route-uuid' })
  routeId?: string;

  @ApiProperty({
    required: false,
    description: 'Customer info JSON (partial or full)',
    example: { fullName: 'New Name', phoneNumber: '0909...' },
    additionalProperties: true,
  })
  customerInfo?: Record<string, unknown>;
}
