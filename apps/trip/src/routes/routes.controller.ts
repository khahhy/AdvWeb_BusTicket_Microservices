import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RoutesService } from './routes.service';

@Controller()
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  // @MessagePattern({ cmd: 'get_top_performing_routes' })
  // getTopPerforming(@Payload() limit: number) {
  //   return this.routesService.getTopPerforming(limit);
  // }

  @MessagePattern({ cmd: 'find_trip_route_maps' })
  findAllTripRouteMaps(@Payload() query: any) {
    return this.routesService.findAllTripRouteMaps(query);
  }

  @MessagePattern({ cmd: 'get_trip_route_map_detail' })
  getTripRouteMapDetail(@Payload() p: { tripId: string; routeId: string }) {
    return this.routesService.getTripRouteMap(p.tripId, p.routeId);
  }

  @MessagePattern({ cmd: 'create_trip_route_map' })
  createTripRouteMap(@Payload() p: any) {
    return this.routesService.createTripRouteMap(
      p.dto,
      p.userId,
      p.ip,
      p.userAgent,
    );
  }

  // @MessagePattern({ cmd: 'remove_trip_route_map' })
  // removeTripRouteMap(@Payload() p: any) {
  //   return this.routesService.removeTripRouteMap(
  //     p.tripId,
  //     p.routeId,
  //     p.userId,
  //     p.ip,
  //     p.userAgent,
  //   );
  // }

  @MessagePattern({ cmd: 'create_route' })
  create(@Payload() p: any) {
    return this.routesService.create(p.dto, p.userId, p.ip, p.userAgent);
  }

  @MessagePattern({ cmd: 'find_all_routes' })
  findAll(
    @Payload()
    p: {
      originId: string;
      destinationId: string;
      isActive: boolean;
    },
  ) {
    return this.routesService.findAll(p.originId, p.destinationId, p.isActive);
  }

  @MessagePattern({ cmd: 'find_one_route' })
  findOne(@Payload() id: string) {
    return this.routesService.findOne(id);
  }

  @MessagePattern({ cmd: 'update_route' })
  update(@Payload() p: any) {
    return this.routesService.update(p.id, p.dto, p.userId, p.ip, p.userAgent);
  }

  // @MessagePattern({ cmd: 'delete_route' })
  // remove(@Payload() p: any) {
  //   return this.routesService.remove(p.id, p.userId, p.ip, p.userAgent);
  // }

  @MessagePattern({ cmd: 'get_trips_for_route' })
  getTripsForRoute(@Payload() p: { id: string; query: any }) {
    return this.routesService.findTripsForRoute(p.id, p.query);
  }
}
