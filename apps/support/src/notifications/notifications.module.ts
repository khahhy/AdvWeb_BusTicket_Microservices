import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsSchedulerService } from './notifications-scheduler.service';
import { SmsService } from './sms.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from '../email/email.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsSchedulerService,
    SmsService,
    EmailService,
  ],
  exports: [NotificationsService, SmsService],
})
export class NotificationsModule {}
