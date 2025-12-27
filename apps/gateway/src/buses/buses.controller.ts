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
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import {
  CreateBusDto,
  UpdateBusDto,
  QueryBusesDto,
  BusDto,
  SeatDto,
} from '@app/shared/dto';
import {
  UserRole,
  JwtAuthGuard,
  RolesGuard,
  Roles,
  BaseResponse,
  handleRpcError,
  type RequestWithUser,
} from '@app/shared';

@ApiTags('Buses')
@Controller('buses')
export class BusesController {
  constructor(
    @Inject('TRIP_SERVICE') private readonly tripClient: ClientProxy,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new bus and generate its seats (Admin)' })
  @ApiBody({ type: CreateBusDto })
  @ApiResponse({
    status: 201,
    description: 'Bus created successfully.',
    type: BusDto,
  })
  @ApiResponse({ status: 400, description: 'Plate already exists.' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createBusDto: CreateBusDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<BusDto>>(
          { cmd: 'create_bus' },
          {
            dto: createBusDto,
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

  @ApiOperation({ summary: 'Get all buses with optional filtering' })
  @ApiResponse({
    status: 200,
    description: 'Fetched all buses successfully.',
    type: [BusDto],
  })
  @Get()
  async findAll(@Query() query: QueryBusesDto) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<BusDto[]>>(
          { cmd: 'find_all_buses' },
          query,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({ summary: 'Get a specific bus by ID' })
  @ApiParam({ name: 'id', description: 'Bus ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Fetched bus details successfully.',
    type: BusDto,
  })
  @ApiResponse({ status: 404, description: 'Bus not found.' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<BusDto>>({ cmd: 'find_one_bus' }, id),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({ summary: 'Get all seats for a specific bus' })
  @ApiParam({ name: 'id', description: 'Bus ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Fetched seats successfully.',
    type: [SeatDto],
  })
  @ApiResponse({ status: 404, description: 'Bus not found.' })
  @Get(':id/seats')
  async getSeats(@Param('id') id: string) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<SeatDto[]>>(
          { cmd: 'get_bus_seats' },
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
  @ApiOperation({ summary: 'Update bus info (Admin)' })
  @ApiParam({ name: 'id', description: 'Bus ID', type: String })
  @ApiBody({ type: UpdateBusDto })
  @ApiResponse({
    status: 200,
    description: 'Bus updated successfully.',
    type: BusDto,
  })
  @ApiResponse({ status: 404, description: 'Bus not found.' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBusDto: UpdateBusDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<BusDto>>(
          { cmd: 'update_bus' },
          {
            id,
            dto: updateBusDto,
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
  @ApiOperation({ summary: 'Delete bus (Admin)' })
  @ApiParam({ name: 'id', description: 'Bus ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Bus deleted successfully.',
    type: BusDto,
  })
  @ApiResponse({ status: 404, description: 'Bus not found.' })
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<BusDto>>(
          { cmd: 'delete_bus' },
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
