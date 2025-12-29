import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TripsService } from './trips.service';
import {
  CreateTripDto,
  TripQueryDto,
  SearchTripDto,
  UpdateTripDto,
  TripsFindByStartTimeRangeDto,
} from '@app/shared/dto';
import { TripStatus } from '@app/shared/enums';

@Controller()
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @MessagePattern({ cmd: 'create_trip' })
  async create(
    @Payload()
    payload: {
      dto: CreateTripDto;
      userId: string;
      ip: string;
      userAgent: string;
    },
  ) {
    return this.tripsService.create(
      payload.dto,
      payload.userId,
      payload.ip,
      payload.userAgent,
    );
  }

  @MessagePattern({ cmd: 'find_all_trips' })
  async findAll(@Payload() query: TripQueryDto) {
    return this.tripsService.findAll(query);
  }

  @MessagePattern({ cmd: 'get_upcoming_trips' })
  async getUpcomingTrips(@Payload() limit: number) {
    return this.tripsService.getUpcomingTrips(limit);
  }

  @MessagePattern({ cmd: 'search_trips' })
  async searchTrips(@Payload() dto: SearchTripDto) {
    return this.tripsService.searchTrips(dto);
  }

  @MessagePattern({ cmd: 'get_trip_detail' })
  async findOne(@Payload() payload: { id: string; includeRoutes: string }) {
    const trip = await this.tripsService.findOne(
      payload.id,
      payload.includeRoutes,
    );
    return { status: 'success', data: trip };
  }

  @MessagePattern({ cmd: 'update_trip' })
  async update(
    @Payload()
    payload: {
      id: string;
      dto: UpdateTripDto;
      userId: string;
      ip: string;
      userAgent: string;
    },
  ) {
    return this.tripsService.update(
      payload.id,
      payload.dto,
      payload.userId,
      payload.ip,
      payload.userAgent,
    );
  }

  @MessagePattern({ cmd: 'update_trip_status' })
  async updateStatus(
    @Payload()
    payload: {
      id: string;
      status: TripStatus;
      userId: string;
      ip: string;
      userAgent: string;
    },
  ) {
    return this.tripsService.updateStatus(
      payload.id,
      payload.status,
      payload.userId,
      payload.ip,
      payload.userAgent,
    );
  }

  @MessagePattern({ cmd: 'delete_trip' })
  async remove(
    @Payload()
    payload: {
      id: string;
      userId: string;
      ip: string;
      userAgent: string;
    },
  ) {
    return this.tripsService.remove(
      payload.id,
      payload.userId,
      payload.ip,
      payload.userAgent,
    );
  }

  @MessagePattern({ cmd: 'get_trip_seats_status' })
  async getSeatsStatus(
    @Payload() payload: { tripId: string; routeId: string },
  ) {
    return this.tripsService.getSeatsStatus(payload.tripId, payload.routeId);
  }

  @MessagePattern({ cmd: 'find_one_seat' })
  findOneSeat(@Payload() seatId: string) {
    return this.tripsService.findOneSeat(seatId);
  }

  @MessagePattern({ cmd: 'trips_find_recent_with_capacity' })
  findRecentWithCapacity(@Payload() payload: { days?: number }) {
    return this.tripsService.findRecentWithCapacity(payload?.days ?? 30);
  }

  @MessagePattern({ cmd: 'trips_find_by_start_time_range' })
  async findByStartTimeRange(@Payload() dto: TripsFindByStartTimeRangeDto) {
    return this.tripsService.findIdsByStartTimeRange(dto);
  }
}
