import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsSchedulerService } from './notifications-scheduler.service';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from '../email/email.service';

@Module({
  imports: [
    PrismaModule,
    ClientsModule.register([
      {
        name: 'IDENTITY_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3001, // port Identity
        },
      },
    ]),
  ],
  controllers: [NotificationsController, SmsController],
  providers: [
    NotificationsService,
    NotificationsSchedulerService,
    SmsService,
    EmailService,
  ],
  exports: [NotificationsService, SmsService],
})
export class NotificationsModule {}
