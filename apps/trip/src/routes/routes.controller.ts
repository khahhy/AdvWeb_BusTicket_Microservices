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
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from '@prisma/client';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { GetRouteTripsDto } from './dto/get-route-trips';
import { CreateTripRouteMapDto } from './dto/create-trip-route-map.dto';
import { QueryTripRouteMapDto } from './dto/query-trip-route-map.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { RequestWithUser } from 'src/common/type/request-with-user.interface';

@ApiTags('routes')
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

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
  @ApiResponse({ status: 200, description: 'Fetched top routes successfully.' })
  async getTopPerforming(@Query('limit') limit?: number) {
    const limitNumber = limit ? Number(limit) : 5;
    return this.routesService.getTopPerforming(limitNumber);
  }

  @ApiOperation({
    summary: 'Get all trip route maps (Pagination & Filter)',
    description:
      'Supports filtering by TripId, RouteId, LocationId (Origin/Dest), Price range...',
  })
  @ApiResponse({ status: 200, description: 'Fetched list successfully.' })
  @Get('trip-maps')
  async findAllTripRouteMaps(@Query() query: QueryTripRouteMapDto) {
    return this.routesService.findAllTripRouteMaps(query);
  }

  @ApiOperation({
    summary: 'Get detail of a Trip-Route Map',
    description:
      'Returns pricing, schedule, and bus info for a specific trip on a specific route.',
  })
  @ApiQuery({
    name: 'tripId',
    required: true,
    example: '599cfe9c-c930-402b-ba2c-db769e404db9',
  })
  @ApiQuery({
    name: 'routeId',
    required: true,
    example: '406b44e7-9f4b-484a-a5d9-d6756dffecd7',
  })
  @ApiResponse({ status: 200, description: 'Fetched successfully.' })
  @ApiResponse({ status: 404, description: 'Configuration not found.' })
  @Get('trip-map/detail')
  getTripRouteMapDetail(
    @Query('tripId') tripId: string,
    @Query('routeId') routeId: string,
  ) {
    return this.routesService.getTripRouteMap(tripId, routeId);
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
  @ApiResponse({
    status: 400,
    description: 'Invalid Trip/Route or mismatch sequences.',
  })
  @Post('trip-map')
  @HttpCode(HttpStatus.CREATED)
  createTripRouteMap(
    @Body() createDto: CreateTripRouteMapDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    const ip = req.ip as string;
    const userAgent = req.headers['user-agent'] as string;
    return this.routesService.createTripRouteMap(
      createDto,
      userId,
      ip,
      userAgent,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a Trip-Route Map configuration',
    description:
      'Removes the pricing/link between a Trip and a Route. Only possible if NO bookings exist for this specific pair.',
  })
  @ApiQuery({ name: 'tripId', required: true })
  @ApiQuery({ name: 'routeId', required: true })
  @ApiResponse({ status: 200, description: 'Deleted successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete due to existing bookings.',
  })
  @ApiResponse({ status: 404, description: 'Configuration not found.' })
  @Delete('trip-map/remove')
  removeTripRouteMap(
    @Query('tripId') tripId: string,
    @Query('routeId') routeId: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    const ip = req.ip as string;
    const userAgent = req.headers['user-agent'] as string;
    return this.routesService.removeTripRouteMap(
      tripId,
      routeId,
      userId,
      ip,
      userAgent,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new route (Auto-generate name from locations)',
  })
  @ApiBody({ type: CreateRouteDto })
  @ApiResponse({ status: 201, description: 'Route created successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Origin/Destination same or Route exists.',
  })
  @ApiResponse({
    status: 404,
    description: 'Origin/Destination location not found.',
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createRouteDto: CreateRouteDto, @Req() req: RequestWithUser) {
    const userId = req.user.userId;
    const ip = req.ip as string;
    const userAgent = req.headers['user-agent'] as string;
    return this.routesService.create(createRouteDto, userId, ip, userAgent);
  }

  @ApiOperation({ summary: 'Get all routes with optional filters' })
  @ApiQuery({
    name: 'originLocationId',
    required: false,
    description: 'Filter by Origin ID',
  })
  @ApiQuery({
    name: 'destinationLocationId',
    required: false,
    description: 'Filter by Destination ID',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by Status (true/false)',
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: 'Fetched routes successfully.',
  })
  @Get()
  findAll(
    @Query('originLocationId') originId?: string,
    @Query('destinationLocationId') destinationId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const isActiveBool =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.routesService.findAll(originId, destinationId, isActiveBool);
  }

  @ApiOperation({ summary: 'Get a specific route by ID' })
  @ApiParam({ name: 'id', description: 'Route ID' })
  @ApiResponse({ status: 200, description: 'Fetched route successfully.' })
  @ApiResponse({ status: 404, description: 'Route not found.' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.routesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a route (updates name if location changes)',
  })
  @ApiParam({ name: 'id', description: 'Route ID' })
  @ApiBody({ type: UpdateRouteDto })
  @ApiResponse({ status: 200, description: 'Route updated successfully.' })
  @ApiResponse({ status: 404, description: 'Route not found.' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRouteDto: UpdateRouteDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    const ip = req.ip as string;
    const userAgent = req.headers['user-agent'] as string;
    return this.routesService.update(id, updateRouteDto, userId, ip, userAgent);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a route',
    description:
      'Deletes a route and its related trip-maps. Only possible if NO bookings exist.',
  })
  @ApiParam({ name: 'id', description: 'Route ID' })
  @ApiResponse({ status: 200, description: 'Route deleted successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete due to existing bookings.',
  })
  @ApiResponse({ status: 404, description: 'Route not found.' })
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    const userId = req.user.userId;
    const ip = req.ip as string;
    const userAgent = req.headers['user-agent'] as string;
    return this.routesService.remove(id, userId, ip, userAgent);
  }

  @ApiOperation({
    summary:
      'Get available trips for a specific route with dynamic pricing, just contain stop of route, maybe not activate',
    description:
      'Calculates price based on distance and surcharges (weekend/holiday). Does not save to DB.',
  })
  @ApiParam({ name: 'id', description: 'Route ID' })
  @ApiResponse({ status: 200, description: 'List of trips with pricing.' })
  @Get(':id/trips')
  getTripsForRoute(@Param('id') id: string, @Query() query: GetRouteTripsDto) {
    return this.routesService.findTripsForRoute(id, query);
  }
}
