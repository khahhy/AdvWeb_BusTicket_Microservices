import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RoutesService } from './routes.service';
import {
  CreateRouteDto,
  UpdateRouteDto,
  GetRouteTripsDto,
  CreateTripRouteMapDto,
  QueryTripRouteMapDto,
} from '@app/shared/dto';

@Controller()
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @MessagePattern({ cmd: 'get_top_performing_routes' })
  async getTopPerforming(@Payload() limit: number) {
    return this.routesService.getTopPerforming(limit);
  }

  @MessagePattern({ cmd: 'find_trip_route_maps' })
  async findAllTripRouteMaps(@Payload() query: QueryTripRouteMapDto) {
    return this.routesService.findAllTripRouteMaps(query);
  }

  @MessagePattern({ cmd: 'get_trip_route_map_detail' })
  async getTripRouteMapDetail(
    @Payload() p: { tripId: string; routeId: string },
  ) {
    return this.routesService.getTripRouteMap(p.tripId, p.routeId);
  }

  @MessagePattern({ cmd: 'create_trip_route_map' })
  async createTripRouteMap(
    @Payload()
    payload: {
      dto: CreateTripRouteMapDto;
      userId: string;
      ip: string;
      userAgent: string;
    },
  ) {
    return this.routesService.createTripRouteMap(
      payload.dto,
      payload.userId,
      payload.ip,
      payload.userAgent,
    );
  }

  @MessagePattern({ cmd: 'remove_trip_route_map' })
  async removeTripRouteMap(
    @Payload()
    payload: {
      tripId: string;
      routeId: string;
      userId: string;
      ip: string;
      userAgent: string;
    },
  ) {
    return this.routesService.removeTripRouteMap(
      payload.tripId,
      payload.routeId,
      payload.userId,
      payload.ip,
      payload.userAgent,
    );
  }

  @MessagePattern({ cmd: 'create_route' })
  async create(
    @Payload()
    payload: {
      dto: CreateRouteDto;
      userId: string;
      ip: string;
      userAgent: string;
    },
  ) {
    return this.routesService.create(
      payload.dto,
      payload.userId,
      payload.ip,
      payload.userAgent,
    );
  }

  @MessagePattern({ cmd: 'find_all_routes' })
  async findAll(
    @Payload()
    payload: {
      originId?: string;
      destinationId?: string;
      isActive?: boolean;
    },
  ) {
    return this.routesService.findAll(
      payload.originId,
      payload.destinationId,
      payload.isActive,
    );
  }

  @MessagePattern({ cmd: 'find_one_route' })
  async findOne(@Payload() id: string) {
    return this.routesService.findOne(id);
  }

  @MessagePattern({ cmd: 'update_route' })
  async update(
    @Payload()
    payload: {
      id: string;
      dto: UpdateRouteDto;
      userId: string;
      ip: string;
      userAgent: string;
    },
  ) {
    return this.routesService.update(
      payload.id,
      payload.dto,
      payload.userId,
      payload.ip,
      payload.userAgent,
    );
  }

  @MessagePattern({ cmd: 'delete_route' })
  async remove(
    @Payload()
    payload: {
      id: string;
      userId: string;
      ip: string;
      userAgent: string;
    },
  ) {
    return this.routesService.remove(
      payload.id,
      payload.userId,
      payload.ip,
      payload.userAgent,
    );
  }

  @MessagePattern({ cmd: 'get_trips_for_route' })
  async getTripsForRoute(
    @Payload() payload: { id: string; query: GetRouteTripsDto },
  ) {
    return this.routesService.findTripsForRoute(payload.id, payload.query);
  }
}
