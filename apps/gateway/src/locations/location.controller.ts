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
import { JwtAuthGuard, Roles } from '@app/shared';
import { RolesGuard } from '@app/shared/guards';
import {
  CreateLocationDto,
  UpdateLocationDto,
  QueryLocationDto,
} from '@app/shared/dto';
import { UserRole } from '@app/shared/enums';
import type { RequestWithUser } from '@app/shared/type';

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
  @Post()
  create(
    @Body() createLocationDto: CreateLocationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.tripClient.send(
      { cmd: 'create_location' },
      {
        dto: createLocationDto,
        userId: req.user.userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @ApiOperation({ summary: 'Get all locations' })
  @Get()
  findAll(@Query() query: QueryLocationDto) {
    return this.tripClient.send({ cmd: 'get_locations' }, query);
  }

  @ApiOperation({ summary: 'Get distinct list of cities' })
  @Get('cities')
  getCities() {
    return this.tripClient.send({ cmd: 'get_location_cities' }, {});
  }

  @ApiOperation({ summary: 'Get location details' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tripClient.send({ cmd: 'get_location_detail' }, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.tripClient.send(
      { cmd: 'update_location' },
      {
        id,
        dto: updateLocationDto,
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
      { cmd: 'delete_location' },
      {
        id,
        userId: req.user.userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }
}
