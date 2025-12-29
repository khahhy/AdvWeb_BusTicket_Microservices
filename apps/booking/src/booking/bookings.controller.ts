import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BookingsService } from './bookings.service';
import {
  CreateBookingDto,
  QueryBookingDto,
  LookupBookingDto,
  ModifyBookingDto,
  BookingCountByTripDto,
  SeatStatusRequestDto,
} from '@app/shared/dto';

@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @MessagePattern({ cmd: 'create_booking' })
  async create(@Payload() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

  @MessagePattern({ cmd: 'find_all_bookings' })
  async findAll(@Payload() query: QueryBookingDto) {
    return this.bookingsService.findAll(query);
  }

  @MessagePattern({ cmd: 'find_one_booking' })
  async findOne(@Payload() id: string) {
    return this.bookingsService.findOne(id);
  }

  @MessagePattern({ cmd: 'find_all_bookings_by_user' })
  async findAllByUser(@Payload() userId: string) {
    return this.bookingsService.findAllByUser(userId);
  }

  @MessagePattern({ cmd: 'find_bookings_by_guest_info' })
  async findByGuestInfo(@Payload() dto: LookupBookingDto) {
    return this.bookingsService.findByGuestInfo(dto);
  }

  @MessagePattern({ cmd: 'find_booking_by_ticket_code' })
  async findByTicketCode(
    @Payload()
    p: {
      ticketCode: string;
      email: string;
    },
  ) {
    return this.bookingsService.findByTicketCode(p.ticketCode, p.email);
  }

  @MessagePattern({ cmd: 'lock_seat' })
  async lockSeat(
    @Payload()
    p: {
      userId: string;
      tripId: string;
      seatId: string;
      routeId: string;
    },
  ) {
    return this.bookingsService.lockSeat(
      p.userId,
      p.tripId,
      p.seatId,
      p.routeId,
    );
  }

  @MessagePattern({ cmd: 'unlock_seat' })
  async unlockSeat(
    @Payload()
    p: {
      userId: string;
      tripId: string;
      seatId: string;
      routeId: string;
    },
  ) {
    return this.bookingsService.unlockSeat(
      p.userId,
      p.tripId,
      p.seatId,
      p.routeId,
    );
  }

  @MessagePattern({ cmd: 'cancel_booking' })
  async cancelBooking(
    @Payload()
    p: {
      id: string;
      userId?: string;
    },
  ) {
    return this.bookingsService.cancel(p.id, p.userId);
  }

  @MessagePattern({ cmd: 'cancel_booking_by_ticket_code' })
  async cancelByTicketCode(
    @Payload()
    p: {
      ticketCode: string;
      email: string;
    },
  ) {
    return this.bookingsService.cancelByTicketCode(p.ticketCode, p.email);
  }

  @MessagePattern({ cmd: 'modify_booking' })
  async modifyBooking(
    @Payload()
    p: {
      id: string;
      userId: string;
      modifyData: ModifyBookingDto;
    },
  ) {
    return this.bookingsService.modify(p.id, p.userId, p.modifyData);
  }

  @MessagePattern({ cmd: 'get_booking_stats' })
  async getStats() {
    return this.bookingsService.getStats();
  }

  @MessagePattern({ cmd: 'get_booking_revenue_chart' })
  async getRevenueChart() {
    return this.bookingsService.getRevenueChart();
  }

  @MessagePattern({ cmd: 'get_booking_trends' })
  async getBookingTrends() {
    return this.bookingsService.getBookingTrends();
  }

  @MessagePattern({ cmd: 'get_booking_occupancy_rate' })
  async getOccupancyRate() {
    return this.bookingsService.getOccupancyRate();
  }

  @MessagePattern({ cmd: 'send_eticket_email' })
  async sendETicketEmail(@Payload() ticketCode: string) {
    return this.bookingsService.sendETicketEmail(ticketCode);
  }

  @MessagePattern({ cmd: 'send_booking_confirmation_sms' })
  async sendBookingConfirmationSms(@Payload() ticketCode: string) {
    return this.bookingsService.sendBookingConfirmationSms(ticketCode);
  }

  @MessagePattern({ cmd: 'confirm_bookings_many' })
  confirmMany(@Payload() p: { bookingIds: string[] }) {
    return this.bookingsService.confirmMany(p.bookingIds);
  }

  @MessagePattern({ cmd: 'booking_count_active_users' })
  countActiveUsers(
    @Payload()
    p: {
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    return this.bookingsService.countActiveUsers(p?.dateFrom, p?.dateTo);
  }

  @MessagePattern({ cmd: 'booking_upcoming_for_reminder' })
  upcomingForReminder(@Payload() p: { from: string; to: string }) {
    return this.bookingsService.upcomingForReminder(p.from, p.to);
  }

  @MessagePattern({ cmd: 'booking_get_top_routes' })
  getTopRoutes(@Payload() p: { limit?: number }) {
    return this.bookingsService.getTopRoutes(p.limit ?? 5);
  }

  @MessagePattern({ cmd: 'booking_count_by_trip' })
  countByTrip(@Payload() p: BookingCountByTripDto) {
    return this.bookingsService.countByTrip(p.tripId, p.statuses);
  }

  @MessagePattern({ cmd: 'booking_get_booked_seat_ids_for_segments' })
  getBookedSeatIdsForSegments(@Payload() p: SeatStatusRequestDto) {
    return this.bookingsService.getBookedSeatIdsForSegments(p);
  }
}
