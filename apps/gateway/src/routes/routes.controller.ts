import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import {
  CreateRouteDto,
  UpdateRouteDto,
  GetRouteTripsDto,
  CreateTripRouteMapDto,
  QueryTripRouteMapDto,
  RouteDto,
  TripRouteMapDetailDto,
  TopPerformingRouteDto,
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

@ApiTags('Routes')
@Controller('routes')
export class RoutesController {
  constructor(
    @Inject('TRIP_SERVICE') private readonly tripClient: ClientProxy,
  ) {}

  @Get('top-performing')
  @ApiOperation({
    summary: 'Dashboard: Get top performing routes by booking count',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Default: 5',
  })
  @ApiResponse({
    status: 200,
    description: 'Fetched top routes successfully.',
    type: [TopPerformingRouteDto],
  })
  async getTopPerforming(@Query('limit') limit?: number) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<TopPerformingRouteDto[]>>(
          { cmd: 'get_top_performing_routes' },
          limit ? Number(limit) : 5,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({
    summary: 'Get all trip route maps (Pagination & Filter)',
    description:
      'Supports filtering by TripId, RouteId, LocationId (Origin/Dest), Price range...',
  })
  @ApiResponse({ status: 200, description: 'Fetched list successfully.' })
  @Get('trip-maps')
  async findAllTripRouteMaps(@Query() query: QueryTripRouteMapDto) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<any>>(
          { cmd: 'find_trip_route_maps' },
          query,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({
    summary: 'Get detail of a Trip-Route Map',
    description:
      'Returns pricing, schedule, and bus info for a specific trip on a specific route.',
  })
  @ApiQuery({ name: 'tripId', required: true })
  @ApiQuery({ name: 'routeId', required: true })
  @ApiResponse({
    status: 200,
    description: 'Fetched successfully.',
    type: TripRouteMapDetailDto,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found.' })
  @Get('trip-map/detail')
  async getTripRouteMapDetail(
    @Query('tripId') tripId: string,
    @Query('routeId') routeId: string,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<TripRouteMapDetailDto>>(
          { cmd: 'get_trip_route_map_detail' },
          { tripId, routeId },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a Trip-Route Map (Save pricing configuration)',
    description:
      'Links a Route to a Trip and saves the calculated price (or manual price) to the database.',
  })
  @ApiBody({ type: CreateTripRouteMapDto })
  @ApiResponse({
    status: 201,
    description: 'TripRouteMap created successfully.',
  })
  @ApiResponse({
    status: 409,
    description: 'TripRouteMap already exists for this pair.',
  })
  @Post('trip-map')
  @HttpCode(HttpStatus.CREATED)
  async createTripRouteMap(
    @Body() createDto: CreateTripRouteMapDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<TripRouteMapDetailDto>>(
          { cmd: 'create_trip_route_map' },
          {
            dto: createDto,
            userId: req.user.userId,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a Trip-Route Map configuration',
  })
  @ApiQuery({ name: 'tripId', required: true })
  @ApiQuery({ name: 'routeId', required: true })
  @ApiResponse({ status: 200, description: 'Deleted successfully.' })
  @Delete('trip-map/remove')
  async removeTripRouteMap(
    @Query('tripId') tripId: string,
    @Query('routeId') routeId: string,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<null>>(
          { cmd: 'remove_trip_route_map' },
          {
            tripId,
            routeId,
            userId: req.user.userId,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new route (Auto-generate name from locations)',
  })
  @ApiBody({ type: CreateRouteDto })
  @ApiResponse({ status: 201, type: RouteDto })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createRouteDto: CreateRouteDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<RouteDto>>(
          { cmd: 'create_route' },
          {
            dto: createRouteDto,
            userId: req.user.userId,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({ summary: 'Get all routes with optional filters' })
  @ApiQuery({ name: 'originLocationId', required: false })
  @ApiQuery({ name: 'destinationLocationId', required: false })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'true/false',
    type: Boolean,
  })
  @ApiResponse({ status: 200, type: [RouteDto] })
  @Get()
  async findAll(
    @Query('originLocationId') originId?: string,
    @Query('destinationLocationId') destinationId?: string,
    @Query('isActive') isActive?: string,
  ) {
    try {
      const isActiveBool =
        isActive === 'true' ? true : isActive === 'false' ? false : undefined;

      return await firstValueFrom(
        this.tripClient.send<BaseResponse<RouteDto[]>>(
          { cmd: 'find_all_routes' },
          { originId, destinationId, isActive: isActiveBool },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({ summary: 'Get a specific route by ID' })
  @ApiResponse({ status: 200, type: RouteDto })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<RouteDto>>(
          { cmd: 'find_one_route' },
          id,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a route' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateRouteDto: UpdateRouteDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<RouteDto>>(
          { cmd: 'update_route' },
          {
            id,
            dto: updateRouteDto,
            userId: req.user.userId,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a route' })
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<null>>(
          { cmd: 'delete_route' },
          {
            id,
            userId: req.user.userId,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({
    summary: 'Get available trips for a specific route with dynamic pricing',
  })
  @Get(':id/trips')
  async getTripsForRoute(
    @Param('id') id: string,
    @Query() query: GetRouteTripsDto,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<any>>(
          { cmd: 'get_trips_for_route' },
          { id, query },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }
}
