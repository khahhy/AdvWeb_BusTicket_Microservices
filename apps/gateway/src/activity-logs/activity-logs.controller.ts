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
import { JwtAuthGuard, RolesGuard, UserRole, Roles } from '@app/shared';

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
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.supportClient.send(
      { cmd: 'get_all_logs' },
      { page: Number(page), limit: Number(limit) },
    );
  }

  @ApiOperation({ summary: 'Admin: Get history of a specific user' })
  @ApiParam({ name: 'userId', description: 'User UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Fetched user history successfully.',
  })
  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.supportClient.send({ cmd: 'get_logs_by_user' }, userId);
  }
}
