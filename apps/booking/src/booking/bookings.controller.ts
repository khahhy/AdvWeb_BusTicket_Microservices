import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BookingsService } from './bookings.service';
import {
  CreateBookingDto,
  QueryBookingDto,
  ModifyBookingDto,
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

  @MessagePattern({ cmd: 'get_booking_stats' })
  async getStats() {
    return this.bookingsService.getStats();
  }
}
