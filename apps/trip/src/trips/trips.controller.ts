import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Patch,
  HttpCode,
  HttpStatus,
  Query,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TripsService } from './trips.service';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from '@prisma/client';
import type { RequestWithUser } from 'src/common/type/request-with-user.interface';
import { CreateTripDto } from './dto/create-trip.dto';
import { TripQueryDto } from './dto/trip-query.dto';
import { SearchTripDto } from './dto/search-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { UpdateTripStatusDto } from './dto/update-trip-status.dto';

@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Create a new trip with stops' })
  @ApiBody({ type: CreateTripDto })
  @ApiResponse({ status: 201, description: 'Trip created successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or stops timeline error.',
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createTripDto: CreateTripDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    const ip = req.ip as string;
    const userAgent = req.headers['user-agent'] as string;
    return this.tripsService.create(createTripDto, userId, ip, userAgent);
  }

  @ApiOperation({
    summary:
      'Get all trips with filters (startTime, endTime, origin stop of route, destination stop of route, busId, status). Note: trip contain route, that route maybe not set sold yet',
  })
  @ApiQuery({ name: 'startTime', required: false })
  @ApiQuery({ name: 'endTime', required: false })
  @ApiQuery({
    name: 'origin',
    required: false,
    description: 'Location ID to MATCH as origin stop',
  })
  @ApiQuery({
    name: 'destination',
    required: false,
    description: 'Location ID to MACTH as destination stop',
  })
  @ApiQuery({ name: 'busId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'includeStops', required: false })
  @ApiQuery({ name: 'includeSegments', required: false })
  @Get()
  async findAll(@Query() query: TripQueryDto) {
    return this.tripsService.findAll(query);
  }

  @ApiOperation({
    summary: 'Get upcoming trips for Dashboard',
    description:
      'Returns list of trips starting soon with booking status (booked/total seats)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 5,
    description: 'Number of trips to return',
  })
  @Get('upcoming')
  async getUpcomingTrips(@Query('limit') limit?: number) {
    return this.tripsService.getUpcomingTrips(Number(limit) || 5);
  }

  @ApiOperation({
    summary: 'Search trips by city names and departure date',
    description:
      'Enhanced search that allows searching by city name (e.g., "HCMC") instead of location IDs. Time is taken from trip stops. When searching "HCMC", it will find all bus stations in Ho Chi Minh City.',
  })
  @ApiQuery({
    name: 'originCity',
    required: false,
    description:
      'Origin city name (e.g., "HCMC", "Hà Nội"). Will find all locations in this city.',
    example: 'HCMC',
  })
  @ApiQuery({
    name: 'destinationCity',
    required: false,
    description:
      'Destination city name (e.g., "Đà Nẵng", "Cần Thơ"). Will find all locations in this city.',
    example: 'Đà Nẵng',
  })
  @ApiQuery({
    name: 'departureDate',
    required: false,
    description:
      'Departure date (YYYY-MM-DD format). Will search trips that depart on this date.',
    example: '2024-12-15',
  })
  @ApiQuery({
    name: 'includeStops',
    required: false,
    description: 'Include detailed trip stops information',
    example: 'true',
  })
  @ApiQuery({
    name: 'includeRoutes',
    required: false,
    description: 'Include route information',
    example: 'true',
  })
  @ApiResponse({
    status: 200,
    description:
      'Trips found successfully with route information based on trip stops',
  })
  @Get('search')
  async searchTrips(@Query() searchDto: SearchTripDto) {
    return this.tripsService.searchTrips(searchDto);
  }

  @ApiOperation({ summary: 'Get a trip by ID with stops & segments' })
  @ApiParam({ name: 'id', type: String, required: true })
  @ApiQuery({
    name: 'includeRoutes',
    required: false,
    description: 'Include route and price information',
    example: 'true',
  })
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('includeRoutes') includeRoutes?: string,
  ) {
    return this.tripsService.findOne(id, includeRoutes);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Update a trip (bus, stops, segments)' })
  @ApiBody({ type: UpdateTripDto })
  @ApiParam({ name: 'id', type: String, description: 'Trip ID to update' })
  @ApiResponse({ status: 200, description: 'Trip updated successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or constraints violation.',
  })
  @ApiResponse({ status: 404, description: 'Trip not found.' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    const ip = req.ip as string;
    const userAgent = req.headers['user-agent'] as string;
    return this.tripsService.update(id, dto, userId, ip, userAgent);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @Patch(':id/status')
  @ApiBody({ type: UpdateTripStatusDto })
  @ApiOperation({ summary: 'Update the status of a trip' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTripStatusDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    const ip = req.ip as string;
    const userAgent = req.headers['user-agent'] as string;
    return this.tripsService.updateStatus(
      id,
      dto.status,
      userId,
      ip,
      userAgent,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a trip (only if no bookings exist)' })
  @ApiParam({ name: 'id', type: String })
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    const userId = req.user.userId;
    const ip = req.ip as string;
    const userAgent = req.headers['user-agent'] as string;
    return this.tripsService.remove(id, userId, ip, userAgent);
  }

  @ApiOperation({
    summary: 'Get real-time seat status for a specific Trip and Route',
    description:
      'Returns seat map with status (AVAILABLE/BOOKED) based on the segments of the selected Route.',
  })
  @ApiParam({ name: 'id', description: 'Trip ID', type: String })
  @ApiQuery({
    name: 'routeId',
    description: 'Route ID (to calculate segments)',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Fetched seat map successfully.' })
  @ApiResponse({ status: 404, description: 'Trip or Route not found.' })
  @Get(':id/seats')
  async getSeatsStatus(
    @Param('id') tripId: string,
    @Query('routeId') routeId: string,
  ) {
    return this.tripsService.getSeatsStatus(tripId, routeId);
  }
}
