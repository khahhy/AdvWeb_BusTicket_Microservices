import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface NotificationData {
  template?: string | null;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    try {
      const notifications = await this.prisma.notifications.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return notifications.map((notification) => ({
        id: notification.id,
        type: this.mapNotificationType(notification.type),
        title: this.generateTitle(notification),
        message: notification.content || '',
        timestamp: notification.createdAt.toISOString(),
        isRead: notification.status === 'sent',
        priority: 'medium',
        actionUrl: notification.bookingId
          ? `/booking-details/${notification.bookingId}`
          : undefined,
      }));
    } catch {
      throw new InternalServerErrorException('Failed to fetch notifications');
    }
  }

  async findOne(id: string, userId: string) {
    const notification = await this.prisma.notifications.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this notification',
      );
    }

    return notification;
  }

  async markAsRead(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.notifications.update({
      where: { id },
      data: {
        status: 'sent',
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notifications.updateMany({
      where: {
        userId,
        status: 'pending',
      },
      data: {
        status: 'sent',
      },
    });
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.notifications.delete({
      where: { id },
    });
  }

  private mapNotificationType(type: string): string {
    if (type === 'email') return 'booking';
    return 'system';
  }

  private generateTitle(notification: NotificationData): string {
    const template = notification.template;
    if (template?.includes('booking')) {
      return 'Booking Notification';
    }
    if (template?.includes('payment')) {
      return 'Payment Update';
    }
    return 'System Notification';
  }
}
