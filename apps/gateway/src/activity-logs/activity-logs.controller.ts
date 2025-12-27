import {
  Controller,
  Get,
  Inject,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import {
  JwtAuthGuard,
  RolesGuard,
  UserRole,
  Roles,
  BaseResponse,
  handleRpcError,
  QueryActivityLogDto,
} from '@app/shared';

@ApiTags('activity-logs')
@Controller('activity-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@ApiBearerAuth('JWT-auth')
export class ActivityLogsController {
  constructor(
    @Inject('SUPPORT_SERVICE') private readonly supportClient: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Admin: Get all system activity logs' })
  @ApiResponse({
    status: 200,
    description: 'Fetched all activity logs successfully.',
  })
  async findAll(@Query() query: QueryActivityLogDto) {
    try {
      return await firstValueFrom(
        this.supportClient.send<BaseResponse<any>>(
          { cmd: 'get_all_logs' },
          {
            page: Number(query.page) || 1,
            limit: Number(query.limit) || 20,
          },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({ summary: 'Admin: Get history of a specific user' })
  @ApiParam({ name: 'userId', description: 'User UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Fetched user history successfully.',
  })
  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    try {
      return await firstValueFrom(
        this.supportClient.send<BaseResponse<any>>(
          { cmd: 'get_logs_by_user' },
          userId,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({
    summary: 'Admin: Get history of a specific entity (e.g., Bus, Trip)',
  })
  @ApiParam({
    name: 'type',
    description:
      'Entity Type: Buses, Locations, Routes, Settings, Trips, Users',
    type: String,
  })
  @ApiParam({ name: 'id', description: 'Entity UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Fetched entity history successfully.',
  })
  @Get('entity/:type/:id')
  async findByEntity(@Param('type') type: string, @Param('id') id: string) {
    try {
      return await firstValueFrom(
        this.supportClient.send<BaseResponse<any>>(
          { cmd: 'get_logs_by_entity' },
          { entityId: id, entityType: type },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }
}
