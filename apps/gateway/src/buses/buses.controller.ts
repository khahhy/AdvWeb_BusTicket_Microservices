import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Inject,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  UserRole,
  CreateBusDto,
  UpdateBusDto,
  QueryBusesDto,
} from '@app/shared';

@ApiTags('buses')
@Controller('buses')
export class BusesController {
  constructor(
    @Inject('TRIP_SERVICE') private readonly tripClient: ClientProxy,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new bus' })
  @Post()
  async create(@Body() createBusDto: CreateBusDto, @Req() req: any) {
    return this.tripClient.send(
      { cmd: 'create_bus' },
      {
        dto: createBusDto,
        userId: req.user.userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @ApiOperation({ summary: 'Get all buses' })
  @Get()
  async findAll(@Query() query: QueryBusesDto) {
    return this.tripClient.send({ cmd: 'find_all_buses' }, query);
  }

  @ApiOperation({ summary: 'Get bus details' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tripClient.send({ cmd: 'find_one_bus' }, id);
  }

  @ApiOperation({ summary: 'Get seats of a bus' })
  @Get(':id/seats')
  async getSeats(@Param('id') id: string) {
    return this.tripClient.send({ cmd: 'get_bus_seats' }, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBusDto: UpdateBusDto,
    @Req() req: any,
  ) {
    return this.tripClient.send(
      { cmd: 'update_bus' },
      {
        id,
        dto: updateBusDto,
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
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.tripClient.send(
      { cmd: 'delete_bus' },
      {
        id,
        userId: req.user.userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }
}
