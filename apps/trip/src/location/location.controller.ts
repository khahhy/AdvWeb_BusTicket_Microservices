import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { LocationsService } from './location.service';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from '@prisma/client';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { QueryLocationDto } from './dto/query-location.dto';
import type { RequestWithUser } from 'src/common/type/request-with-user.interface';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new location' })
  @ApiBody({ type: CreateLocationDto })
  @ApiResponse({ status: 201, description: 'Location created successfully.' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createLocationDto: CreateLocationDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    const ip = req.ip as string;
    const userAgent = req.headers['user-agent'] as string;
    return this.locationsService.create(
      createLocationDto,
      userId,
      ip,
      userAgent,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all locations' })
  @ApiResponse({
    status: 200,
    description: 'Fetched all locations successfully.',
  })
  async findAll(@Query() query: QueryLocationDto) {
    return this.locationsService.findAll(query);
  }

  @ApiOperation({
    summary: 'Get distinct list of cities, for example: Hà Nội, Đà Lạt',
  })
  @ApiResponse({
    status: 200,
    description: 'Fetched list of cities successfully.',
  })
  @Get('cities')
  getCities() {
    return this.locationsService.getCities();
  }

  @ApiOperation({ summary: 'Get a location by ID' })
  @ApiParam({ name: 'id', description: 'Location ID', type: String })
  @ApiResponse({ status: 200, description: 'Fetched location successfully.' })
  @ApiResponse({ status: 404, description: 'Location not found.' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.locationsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a location' })
  @ApiParam({ name: 'id', description: 'Location ID', type: String })
  @ApiBody({ type: UpdateLocationDto })
  @ApiResponse({ status: 200, description: 'Location updated successfully.' })
  @ApiResponse({ status: 404, description: 'Location not found.' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    const ip = req.ip as string;
    const userAgent = req.headers['user-agent'] as string;
    return this.locationsService.update(
      id,
      updateLocationDto,
      userId,
      ip,
      userAgent,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a location' })
  @ApiParam({ name: 'id', description: 'Location ID', type: String })
  @ApiResponse({ status: 200, description: 'Location deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Location not found.' })
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    const userId = req.user.userId;
    const ip = req.ip as string;
    const userAgent = req.headers['user-agent'] as string;
    return this.locationsService.remove(id, userId, ip, userAgent);
  }
}
