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
  CreateLocationDto,
  UpdateLocationDto,
  QueryLocationDto,
  LocationDto,
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

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(
    @Inject('TRIP_SERVICE') private readonly tripClient: ClientProxy,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new location' })
  @ApiBody({ type: CreateLocationDto })
  @ApiResponse({
    status: 201,
    description: 'Location created successfully.',
    type: LocationDto,
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createLocationDto: CreateLocationDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<LocationDto>>(
          { cmd: 'create_location' },
          {
            dto: createLocationDto,
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

  @ApiOperation({ summary: 'Get all locations' })
  @ApiResponse({
    status: 200,
    description: 'Fetched all locations successfully.',
    type: [LocationDto],
  })
  @Get()
  async findAll(@Query() query: QueryLocationDto) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<any>>(
          { cmd: 'get_locations' },
          query,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({
    summary: 'Get distinct list of cities, for example: Hà Nội, Đà Lạt',
  })
  @ApiResponse({
    status: 200,
    description: 'Fetched list of cities successfully.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Fetched list of cities successfully',
        data: ['Hà Nội', 'Đà Lạt'],
      },
    },
  })
  @Get('cities')
  async getCities() {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<string[]>>(
          { cmd: 'get_location_cities' },
          {},
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({ summary: 'Get a location by ID' })
  @ApiParam({ name: 'id', description: 'Location ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Fetched location successfully.',
    type: LocationDto,
  })
  @ApiResponse({ status: 404, description: 'Location not found.' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<LocationDto>>(
          { cmd: 'get_location_detail' },
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
  @ApiOperation({ summary: 'Update a location' })
  @ApiParam({ name: 'id', description: 'Location ID', type: String })
  @ApiBody({ type: UpdateLocationDto })
  @ApiResponse({
    status: 200,
    description: 'Location updated successfully.',
    type: LocationDto,
  })
  @ApiResponse({ status: 404, description: 'Location not found.' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<LocationDto>>(
          { cmd: 'update_location' },
          {
            id,
            dto: updateLocationDto,
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
  @ApiOperation({ summary: 'Delete a location' })
  @ApiParam({ name: 'id', description: 'Location ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Location deleted successfully.',
    type: LocationDto,
  })
  @ApiResponse({ status: 404, description: 'Location not found.' })
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<LocationDto>>(
          { cmd: 'delete_location' },
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
