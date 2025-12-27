import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @MessagePattern({ cmd: 'find_all_notifications' })
  async findAllForUser(@Payload() userId: string) {
    return this.notificationsService.findAllForUser(userId);
  }

  @MessagePattern({ cmd: 'find_one_notification' })
  async findOne(@Payload() payload: { id: string; userId: string }) {
    return this.notificationsService.findOne(payload.id, payload.userId);
  }

  @MessagePattern({ cmd: 'mark_notification_read' })
  async markAsRead(@Payload() payload: { id: string; userId: string }) {
    return this.notificationsService.markAsRead(payload.id, payload.userId);
  }

  @MessagePattern({ cmd: 'mark_all_notifications_read' })
  async markAllAsRead(@Payload() userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @MessagePattern({ cmd: 'delete_notification' })
  async delete(@Payload() payload: { id: string; userId: string }) {
    return this.notificationsService.delete(payload.id, payload.userId);
  }
}
