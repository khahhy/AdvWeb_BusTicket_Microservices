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
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'; // ... các decorators khác
import type { RequestWithUser } from '@app/shared';
import {
  CreateTripDto,
  TripQueryDto,
  SearchTripDto,
  UpdateTripDto,
  UpdateTripStatusDto,
  JwtAuthGuard,
  RolesGuard,
  Roles,
  UserRole,
} from '@app/shared';

@ApiTags('trips')
@Controller('trips')
export class TripScheduleController {
  constructor(
    @Inject('TRIP_SERVICE') private readonly tripClient: ClientProxy,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @Post()
  create(@Body() createTripDto: CreateTripDto, @Req() req: RequestWithUser) {
    return this.tripClient.send(
      { cmd: 'create_trip' },
      {
        dto: createTripDto,
        userId: req.user.userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @Get()
  findAll(@Query() query: TripQueryDto) {
    return this.tripClient.send({ cmd: 'find_all_trips' }, query);
  }

  @Get('upcoming')
  getUpcomingTrips(@Query('limit') limit?: number) {
    return this.tripClient.send({ cmd: 'get_upcoming_trips' }, limit || 5);
  }

  @Get('search')
  searchTrips(@Query() searchDto: SearchTripDto) {
    return this.tripClient.send({ cmd: 'search_trips' }, searchDto);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('includeRoutes') includeRoutes?: string,
  ) {
    return this.tripClient.send(
      { cmd: 'get_trip_detail' },
      { id, includeRoutes },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
    @Req() req: RequestWithUser,
  ) {
    return this.tripClient.send(
      { cmd: 'update_trip' },
      {
        id,
        dto,
        userId: req.user.userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTripStatusDto,
    @Req() req: RequestWithUser,
  ) {
    return this.tripClient.send(
      { cmd: 'update_trip_status' },
      {
        id,
        status: dto.status,
        userId: req.user.userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.tripClient.send(
      { cmd: 'delete_trip' },
      {
        id,
        userId: req.user.userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @Get(':id/seats')
  getSeatsStatus(
    @Param('id') tripId: string,
    @Query('routeId') routeId: string,
  ) {
    return this.tripClient.send({ cmd: 'get_trip_seats' }, { tripId, routeId });
  }
}
