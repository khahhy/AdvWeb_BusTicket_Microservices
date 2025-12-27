import { Controller } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { ActivityLogsService } from './activity-logs.service';
import { CreateActivityLogDto } from '@app/shared/dto';

@Controller()
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @EventPattern('log_activity')
  async handleLogActivity(@Payload() data: CreateActivityLogDto) {
    await this.activityLogsService.logAction(data);
  }

  @MessagePattern({ cmd: 'get_all_logs' })
  async findAll(@Payload() query: { page: number; limit: number }) {
    return this.activityLogsService.findAll(query.page, query.limit);
  }

  @MessagePattern({ cmd: 'get_logs_by_user' })
  async findByUser(@Payload() userId: string) {
    return this.activityLogsService.findByUser(userId);
  }

  @MessagePattern({ cmd: 'get_logs_by_entity' })
  async findByEntity(
    @Payload() data: { entityId: string; entityType: string },
  ) {
    return this.activityLogsService.findByEntity(
      data.entityId,
      data.entityType,
    );
  }
}
