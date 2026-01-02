import { Module, DynamicModule } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailModule } from './email/email.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/support/.env'],
    }),
    ScheduleModule.forRoot() as unknown as DynamicModule,

    ClientsModule.registerAsync([
      {
        name: 'BOOKING_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: configService.get<string>('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    PrismaModule,
    EmailModule,
    ActivityLogsModule,
    NotificationsModule,
    ChatbotModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class SupportModule {}
