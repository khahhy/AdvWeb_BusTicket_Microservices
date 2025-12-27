import {
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import {
  JwtAuthGuard,
  BaseResponse,
  handleRpcError,
  type RequestWithUser,
} from '@app/shared';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(
    @Inject('SUPPORT_SERVICE') private readonly supportClient: ClientProxy,
  ) {}

  @ApiOperation({ summary: 'Get all notifications for current user' })
  @ApiResponse({
    status: 200,
    description: 'Fetched notifications successfully.',
  })
  @Get()
  async findAllForUser(@Req() req: RequestWithUser) {
    try {
      return await firstValueFrom(
        this.supportClient.send<BaseResponse<any[]>>(
          { cmd: 'find_all_notifications' },
          req.user.userId,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({ summary: 'Get a notification by ID' })
  @ApiParam({ name: 'id', description: 'Notification ID', type: String })
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await firstValueFrom(
        this.supportClient.send<BaseResponse<any>>(
          { cmd: 'find_one_notification' },
          { id, userId: req.user.userId },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID', type: String })
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await firstValueFrom(
        this.supportClient.send<BaseResponse<any>>(
          { cmd: 'mark_notification_read' },
          { id, userId: req.user.userId },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({ summary: 'Mark all notifications as read' })
  @Patch('mark-all-read')
  async markAllAsRead(@Req() req: RequestWithUser) {
    try {
      return await firstValueFrom(
        this.supportClient.send<BaseResponse<any>>(
          { cmd: 'mark_all_notifications_read' },
          req.user.userId,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID', type: String })
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await firstValueFrom(
        this.supportClient.send<BaseResponse<any>>(
          { cmd: 'delete_notification' },
          { id, userId: req.user.userId },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }
}
