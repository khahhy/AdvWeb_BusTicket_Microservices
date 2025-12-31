import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import {
  CreateBookingDto,
  QueryBookingDto,
  LookupBookingDto,
  ModifyBookingDto,
  BookingListResponseDto,
  BookingResponseDto,
  LockSeatRequestDto,
  UnlockSeatRequestDto,
  BookingStatsResponseDto,
  RevenueChartResponseDto,
  BookingTrendsResponseDto,
  OccupancyRateResponseDto,
  FullETicketResponseDto,
  BookingSagaResponseDto,
} from '@app/shared/dto';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  UserRole,
  BaseResponse,
  handleRpcError,
  type RequestWithUser,
} from '@app/shared';
import { BookingOrchestrator } from './booking-orchestrator.service';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    private readonly bookingOrchestrator: BookingOrchestrator,
  ) {}

  @Post('lock')
  @ApiOperation({ summary: 'Lock a seat temporarily (User/Guest)' })
  @ApiBody({ type: LockSeatRequestDto })
  @ApiResponse({ status: 201, type: BookingResponseDto })
  @ApiResponse({ status: 409, description: 'Seat is already locked/sold.' })
  async lockSeat(
    @Body() body: LockSeatRequestDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      const userId = req.user?.userId || 'guest-temp-id';
      return await firstValueFrom(
        this.bookingClient.send<
          BaseResponse<{
            tripId: string;
            seatId: string;
            routeId: string;
            expiresAt?: string | Date;
          }>
        >({ cmd: 'lock_seat' }, { ...body, userId }),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @Post('unlock')
  @ApiOperation({ summary: 'Unlock a seat (User/Guest)' })
  @ApiBody({ type: UnlockSeatRequestDto })
  @ApiResponse({ status: 201, type: BookingResponseDto })
  async unlockSeat(
    @Body() body: UnlockSeatRequestDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      const userId = req.user?.userId || 'guest-temp-id';
      return await firstValueFrom(
        this.bookingClient.send<
          BaseResponse<{
            tripId: string;
            seatId: string;
            routeId: string;
          }>
        >({ cmd: 'unlock_seat' }, { ...body, userId }),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @Get('stats')
  @ApiOperation({ summary: 'Admin: Get booking statistics' })
  @ApiResponse({ status: 200, type: BookingStatsResponseDto })
  async getStats() {
    try {
      return await firstValueFrom(
        this.bookingClient.send<BaseResponse<BookingStatsResponseDto>>(
          { cmd: 'get_booking_stats' },
          {},
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @Get('revenue-chart')
  @ApiOperation({ summary: 'Admin: Get revenue chart data (Last 30 days)' })
  @ApiResponse({ status: 200, type: RevenueChartResponseDto })
  async getRevenueChart() {
    try {
      return await firstValueFrom(
        this.bookingClient.send<BaseResponse<RevenueChartResponseDto>>(
          { cmd: 'get_booking_revenue_chart' },
          {},
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @Get('booking-trends')
  @ApiOperation({ summary: 'Admin: Get booking trends (Peak hours)' })
  @ApiResponse({ status: 200, type: BookingTrendsResponseDto })
  async getBookingTrends() {
    try {
      return await firstValueFrom(
        this.bookingClient.send<BaseResponse<BookingTrendsResponseDto>>(
          { cmd: 'get_booking_trends' },
          {},
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @Get('occupancy-rate')
  @ApiOperation({
    summary: 'Admin: Get occupancy rate (Avg fill rate last 30 days)',
  })
  @ApiResponse({ status: 200, type: OccupancyRateResponseDto })
  async getOccupancyRate() {
    try {
      return await firstValueFrom(
        this.bookingClient.send<BaseResponse<OccupancyRateResponseDto>>(
          { cmd: 'get_booking_occupancy_rate' },
          {},
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @Post('guest/lookup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Guest: Look up bookings by email and phone number',
  })
  @ApiBody({ type: LookupBookingDto })
  @ApiResponse({ status: 200, type: BookingListResponseDto })
  async lookupGuestBookings(@Body() lookupDto: LookupBookingDto) {
    try {
      return await firstValueFrom(
        this.bookingClient.send<BaseResponse<BookingListResponseDto>>(
          { cmd: 'find_bookings_by_guest_info' },
          lookupDto,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @Get('lookup/:ticketCode')
  @ApiOperation({ summary: 'Look up booking by ticket code and email' })
  @ApiParam({ name: 'ticketCode', description: 'Booking reference code' })
  @ApiQuery({ name: 'email', description: 'Email used when booking' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  async lookupByTicketCode(
    @Param('ticketCode') ticketCode: string,
    @Query('email') email: string,
  ) {
    try {
      return await firstValueFrom(
        this.bookingClient.send<BaseResponse<BookingResponseDto>>(
          { cmd: 'find_booking_by_ticket_code' },
          { ticketCode, email },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @Patch('guest/:ticketCode/cancel')
  @ApiOperation({ summary: 'Guest: Cancel booking by ticket code' })
  @ApiParam({ name: 'ticketCode', description: 'Booking reference code' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'guest@example.com',
        },
      },
    },
  })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  async cancelGuestBooking(
    @Param('ticketCode') ticketCode: string,
    @Body('email') email: string,
  ) {
    try {
      return await firstValueFrom(
        this.bookingClient.send<BaseResponse<BookingResponseDto>>(
          { cmd: 'cancel_booking_by_ticket_code' },
          { ticketCode, email },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @Get('eticket/:ticketCode')
  @ApiOperation({ summary: 'Get e-ticket data by ticket code (for rendering)' })
  @ApiParam({ name: 'ticketCode', description: 'Booking reference code' })
  @ApiResponse({ status: 200, type: FullETicketResponseDto })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  async getETicketData(@Param('ticketCode') ticketCode: string) {
    try {
      return await firstValueFrom(
        this.bookingClient.send<BaseResponse<FullETicketResponseDto>>(
          { cmd: 'get_eticket_full_data' },
          ticketCode,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @Get('eticket/:ticketCode/download')
  @ApiOperation({
    summary: 'Download e-ticket PDF by ticket code (server-generated)',
  })
  @ApiParam({ name: 'ticketCode', description: 'Booking reference code' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'PDF e-ticket file.' })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  @Header('Content-Type', 'application/pdf')
  async downloadETicket(
    @Param('ticketCode') ticketCode: string,
    @Res() res: Response,
  ) {
    try {
      const result = await firstValueFrom(
        this.bookingClient.send<{
          type: 'Buffer';
          data: number[];
        }>({ cmd: 'download_eticket_pdf' }, ticketCode),
      );

      const pdfBuffer = Buffer.from(result.data);

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="eticket-${ticketCode}.pdf"`,
      );
      res.setHeader('Content-Type', 'application/pdf');

      res.send(pdfBuffer);
    } catch (e) {
      handleRpcError(e);
    }
  }

  @Post('eticket/:ticketCode/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend e-ticket email' })
  @ApiParam({ name: 'ticketCode', description: 'Booking reference code' })
  @ApiResponse({
    status: 200,
    description: 'E-ticket email sent successfully.',
  })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  async resendETicket(@Param('ticketCode') ticketCode: string) {
    try {
      return await firstValueFrom(
        this.bookingClient.send<BaseResponse<{ ok: boolean }>>(
          { cmd: 'send_eticket_email' },
          ticketCode,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create booking with payment (Saga Orchestrator)',
    description:
      'Creates a booking and payment link in a single orchestrated transaction. ' +
      'If payment creation fails, the booking will be automatically cancelled (compensating transaction).',
  })
  @ApiBody({ type: CreateBookingDto })
  @ApiResponse({
    status: 201,
    type: BookingSagaResponseDto,
    description: 'Booking and payment created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Seat conflict! The selected seat is already booked/locked.',
  })
  @ApiResponse({ status: 400, description: 'Invalid trip or route logic.' })
  async create(@Body() createBookingDto: CreateBookingDto) {
    try {
      return await this.bookingOrchestrator.createBookingWithPayment(
        createBookingDto,
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @Get()
  @ApiOperation({ summary: 'Get all bookings with filters (Admin)' })
  @ApiResponse({ status: 200, type: BookingListResponseDto })
  async findAll(@Query() query: QueryBookingDto) {
    try {
      return await firstValueFrom(
        this.bookingClient.send<BaseResponse<BookingListResponseDto>>(
          { cmd: 'find_all_bookings' },
          query,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('my-bookings')
  @ApiOperation({ summary: 'Get booking history of current user' })
  @ApiResponse({ status: 200, type: BookingListResponseDto })
  async findMyBookings(@Req() req: RequestWithUser) {
    try {
      return await firstValueFrom(
        this.bookingClient.send<BaseResponse<BookingListResponseDto>>(
          { cmd: 'find_all_bookings_by_user' },
          req.user.userId,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking details by ID' })
  @ApiParam({ name: 'id', description: 'Booking ID', type: String })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  async findOne(@Param('id') id: string) {
    try {
      return await firstValueFrom(
        this.bookingClient.send<BaseResponse<BookingResponseDto>>(
          { cmd: 'find_one_booking' },
          id,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel a booking and release seat locks (Authenticated users)',
  })
  @ApiParam({ name: 'id', description: 'Booking ID', type: String })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel (permission or already cancelled).',
  })
  async cancel(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await firstValueFrom(
        this.bookingClient.send<BaseResponse<BookingResponseDto>>(
          { cmd: 'cancel_booking' },
          { id, userId: req.user.userId },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Patch(':id/modify')
  @ApiOperation({
    summary: 'Modify a booking (change seat, trip, route, or customer info)',
  })
  @ApiParam({ name: 'id', description: 'Booking ID', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tripId: {
          type: 'string',
          format: 'uuid',
          description: 'New trip ID (optional)',
        },
        seatId: {
          type: 'string',
          format: 'uuid',
          description: 'New seat ID (optional)',
        },
        routeId: {
          type: 'string',
          format: 'uuid',
          description: 'New route ID (optional)',
        },
        customerInfo: {
          type: 'object',
          description: 'Updated customer information (optional)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Cannot modify (permission, cancelled, or departed).',
  })
  async modify(
    @Param('id') id: string,
    @Body() modifyData: ModifyBookingDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.bookingClient.send<BaseResponse<BookingResponseDto>>(
          { cmd: 'modify_booking' },
          { id, userId: req.user.userId, modifyData },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }
}
