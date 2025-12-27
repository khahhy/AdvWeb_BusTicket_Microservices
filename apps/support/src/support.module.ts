import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from './email/email.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/support/.env'],
    }),
    PrismaModule,
    EmailModule,
    ActivityLogsModule,
    NotificationsModule,
  ],
  controllers: [],
  providers: [],
})
export class SupportModule {}
