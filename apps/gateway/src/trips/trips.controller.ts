import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Patch,
  Query,
  Delete,
  UseGuards,
  Req,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import {
  CreateTripDto,
  TripQueryDto,
  SearchTripDto,
  UpdateTripDto,
  UpdateTripStatusDto,
  TripDto,
  SeatStatusDto,
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

@ApiTags('Trips')
@Controller('trips')
export class TripsController {
  constructor(
    @Inject('TRIP_SERVICE') private readonly tripClient: ClientProxy,
  ) {}

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
  @ApiResponse({ status: 200, description: 'Search results', type: [TripDto] })
  @Get('search')
  async searchTrips(@Query() searchDto: SearchTripDto) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<TripDto[]>>(
          { cmd: 'search_trips' },
          searchDto,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
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
  @ApiResponse({ status: 200, type: [TripDto] })
  @Get('upcoming')
  async getUpcomingTrips(@Query('limit') limit?: number) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<TripDto[]>>(
          { cmd: 'get_upcoming_trips' },
          limit || 5,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({ summary: 'Get trip details (Public)' })
  @ApiParam({ name: 'id', description: 'Trip ID' })
  @ApiQuery({ name: 'includeRoutes', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: TripDto })
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('includeRoutes') includeRoutes?: boolean,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<TripDto>>(
          { cmd: 'get_trip_detail' },
          { id, includeRoutes: String(includeRoutes) },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
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
  @ApiResponse({
    status: 200,
    description: 'Fetched seat map successfully.',
    type: [SeatStatusDto],
  })
  @ApiResponse({ status: 404, description: 'Trip or Route not found.' })
  @Get(':id/seats')
  async getSeatsStatus(
    @Param('id') tripId: string,
    @Query('routeId') routeId: string,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<SeatStatusDto[]>>(
          { cmd: 'get_trip_seats_status' },
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
  @ApiOperation({ summary: 'Admin: Create a new trip with stops' })
  @ApiBody({ type: CreateTripDto })
  @ApiResponse({
    status: 201,
    description: 'Trip created successfully.',
    type: TripDto,
  })
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
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<TripDto>>(
          { cmd: 'create_trip' },
          {
            dto: createTripDto,
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
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<TripDto[]>>(
          { cmd: 'find_all_trips' },
          query,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Update a trip (bus, stops, segments)' })
  @ApiBody({ type: UpdateTripDto })
  @ApiParam({ name: 'id', type: String, description: 'Trip ID to update' })
  @Patch(':id')
  @ApiResponse({ status: 200, description: 'Trip updated successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or constraints violation.',
  })
  @ApiResponse({ status: 404, description: 'Trip not found.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<TripDto>>(
          { cmd: 'update_trip' },
          {
            id,
            dto,
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
  @ApiOperation({ summary: 'Admin: Update trip status' })
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTripStatusDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<TripDto>>(
          { cmd: 'update_trip_status' },
          {
            id,
            status: dto.status,
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
  @ApiOperation({ summary: 'Delete a trip (only if no bookings exist)' })
  @ApiParam({ name: 'id', type: String })
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<TripDto>>(
          { cmd: 'delete_trip' },
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
}
