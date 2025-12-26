import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TripScheduleService } from './trip-schedule.service';
import {
  CreateTripDto,
  TripQueryDto,
  SearchTripDto,
  UpdateTripDto,
} from '@app/shared/dto';
import { TripStatus } from '@app/shared/enums';

@Controller()
export class TripScheduleController {
  constructor(private readonly tripsService: TripScheduleService) {}

  @MessagePattern({ cmd: 'create_trip' })
  create(@Payload() p: any) {
    return this.tripsService.create(p.dto, p.userId, p.ip, p.userAgent);
  }

  @MessagePattern({ cmd: 'find_all_trips' })
  findAll(@Payload() query: TripQueryDto) {
    return this.tripsService.findAll(query);
  }

  // @MessagePattern({ cmd: 'get_upcoming_trips' })
  // getUpcomingTrips(@Payload() limit: number) {
  //   // Lưu ý: method getUpcomingTrips đang bị comment trong service, nhớ mở ra nhé
  //   return this.tripsService.getUpcomingTrips(limit);
  // }

  @MessagePattern({ cmd: 'search_trips' })
  searchTrips(@Payload() dto: SearchTripDto) {
    return this.tripsService.searchTrips(dto);
  }

  @MessagePattern({ cmd: 'get_trip_detail' })
  findOne(@Payload() p: { id: string; includeRoutes: string }) {
    return this.tripsService.findOne(p.id, p.includeRoutes);
  }

  // Method update đang comment trong service
  @MessagePattern({ cmd: 'update_trip' })
  update(@Payload() p: any) {
    return this.tripsService.update(p.id, p.dto, p.userId, p.ip, p.userAgent);
  }

  @MessagePattern({ cmd: 'update_trip_status' })
  updateStatus(
    @Payload()
    p: {
      id: string;
      status: TripStatus;
      userId: string;
      ip: string;
      userAgent: string;
    },
  ) {
    return this.tripsService.updateStatus(
      p.id,
      p.status,
      p.userId,
      p.ip,
      p.userAgent,
    );
  }

  // Method remove đang comment trong service
  // @MessagePattern({ cmd: 'delete_trip' })
  // remove(@Payload() p: any) {
  //   return this.tripsService.remove(p.id, p.userId, p.ip, p.userAgent);
  // }

  // // Method getSeatsStatus đang comment trong service
  // @MessagePattern({ cmd: 'get_trip_seats' })
  // getSeatsStatus(@Payload() p: { tripId: string; routeId: string }) {
  //   return this.tripsService.getSeatsStatus(p.tripId, p.routeId);
  // }
}
