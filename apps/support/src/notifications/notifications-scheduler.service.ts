import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SmsService } from './sms.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsSchedulerService {
  private readonly logger = new Logger(NotificationsSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly notificationsService: NotificationsService,
    // @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sendTripReminders() {
    this.logger.log('Running trip reminder job...');

    try {
      // TODO:

      this.logger.warn(
        'Skipping sendTripReminders: Needs to be moved to Booking Service or use IPC to fetch bookings.',
      );
    } catch (error) {
      this.logger.error('Error in trip reminder job:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldNotifications() {
    this.logger.log('Running notification cleanup job...');
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.prisma.notifications.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
          status: 'sent',
        },
      });

      this.logger.log(`Cleaned up ${result.count} old notifications`);
    } catch (error) {
      this.logger.error('Error in notification cleanup job:', error);
    }
  }
}
