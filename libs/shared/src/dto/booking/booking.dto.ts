import { ApiProperty } from '@nestjs/swagger';

export class BookingCustomerInfoDto {
  @ApiProperty({ example: 'Hittori Bocchi', description: 'Customer full name' })
  fullName: string;

  @ApiProperty({ example: 'bocchi@email.com', description: 'Customer email' })
  email: string;

  @ApiProperty({ example: '0909123456', description: 'Customer phone number' })
  phoneNumber: string;

  @ApiProperty({
    example: '012345678901',
    required: false,
    description: 'Optional identification card number',
  })
  identificationCard?: string;
}

export class BookingTripLiteDto {
  @ApiProperty({ example: 'Bus Trip', required: false })
  tripName?: string;

  @ApiProperty({ example: '2025-12-29T01:30:00.000Z', type: Date })
  startTime: Date;

  @ApiProperty({
    example: '2025-12-29T06:30:00.000Z',
    type: Date,
    required: false,
  })
  endTime?: Date;

  @ApiProperty({
    required: false,
    description: 'Bus info returned from Trip service (lite)',
    example: { plate: '51A-22222', busType: 'limousine' },
  })
  bus?: {
    plate?: string;
    busType?: string;
  };
}

export class BookingRouteLiteDto {
  @ApiProperty({ example: 'HCM → Da Lat', description: 'Route name' })
  name: string;

  @ApiProperty({
    required: false,
    description: 'Origin location (lite)',
    example: { name: 'Bến xe Miền Đông', city: 'Hồ Chí Minh' },
  })
  origin?: { name: string; city: string };

  @ApiProperty({
    required: false,
    description: 'Destination location (lite)',
    example: { name: 'Bến xe Đà Lạt', city: 'Lâm Đồng' },
  })
  destination?: { name: string; city: string };
}

export class BookingSeatLiteDto {
  @ApiProperty({ example: 'A01', description: 'Seat number label' })
  seatNumber: string;
}

export class BookingStopLiteDto {
  @ApiProperty({ example: 'stop-uuid', description: 'Stop id' })
  id: string;

  @ApiProperty({
    description: 'Location at this stop',
    example: { name: 'Bến xe Miền Đông', city: 'Hồ Chí Minh' },
    required: false,
  })
  location?: { name: string; city: string };
}

/** Booking entity (enriched for admin list / detail) */
export class BookingDto {
  @ApiProperty({ example: 'booking-uuid' })
  id: string;

  @ApiProperty({ example: 'user-uuid', required: false, nullable: true })
  userId?: string | null;

  @ApiProperty({ example: 'trip-uuid' })
  tripId: string;

  @ApiProperty({ example: 'route-uuid' })
  routeId: string;

  @ApiProperty({ example: 'seat-uuid' })
  seatId: string;

  @ApiProperty({ example: 'pickup-stop-uuid' })
  pickupStopId: string;

  @ApiProperty({ example: 'dropoff-stop-uuid' })
  dropoffStopId: string;

  @ApiProperty({
    type: BookingCustomerInfoDto,
    description: 'Stored customer info JSON',
  })
  customerInfo: BookingCustomerInfoDto;

  @ApiProperty({ example: 250000, description: 'Ticket price (number)' })
  price: number;

  @ApiProperty({
    example: 'pendingPayment',
    description: 'BookingStatus enum in booking service',
  })
  status: string;

  @ApiProperty({
    example: 'BTB-9X2K3Q',
    required: false,
    nullable: true,
    description: 'Unique ticket code',
  })
  ticketCode?: string | null;

  @ApiProperty({ example: '2025-12-29T01:00:00.000Z', type: Date })
  createdAt: Date;

  @ApiProperty({ example: '2025-12-29T01:05:00.000Z', type: Date })
  updatedAt: Date;

  // Enriched fields (gateway list/detail may attach these)
  @ApiProperty({ required: false, type: BookingTripLiteDto })
  trip?: BookingTripLiteDto;

  @ApiProperty({ required: false, type: BookingRouteLiteDto })
  route?: BookingRouteLiteDto;

  @ApiProperty({ required: false, type: BookingSeatLiteDto })
  seat?: BookingSeatLiteDto;

  @ApiProperty({ required: false, type: BookingStopLiteDto })
  pickupStop?: BookingStopLiteDto;

  @ApiProperty({ required: false, type: BookingStopLiteDto })
  dropoffStop?: BookingStopLiteDto;

  @ApiProperty({
    required: false,
    description: 'User info from Identity service (lite)',
    example: { fullName: 'A', email: 'a@b.com', phoneNumber: '0909...' },
  })
  user?: { fullName: string; email: string; phoneNumber: string };
}

/** Pagination meta for list */
export class PaginationMetaDto {
  @ApiProperty({ example: 120 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 12 })
  totalPages: number;
}

/** Standard list response */
export class BookingListResponseDto {
  @ApiProperty({ example: 'Fetched bookings successfully' })
  message: string;

  @ApiProperty({ type: [BookingDto] })
  data: BookingDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

/** Standard single response */
export class BookingResponseDto {
  @ApiProperty({ example: 'Fetched booking details successfully' })
  message: string;

  @ApiProperty({ type: BookingDto })
  data: BookingDto;
}
