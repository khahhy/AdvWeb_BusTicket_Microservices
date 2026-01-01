import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SharedAuthModule } from '@app/shared';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { BusesModule } from './buses/buses.module';
import { LocationModule } from './locations/location.module';
import { TripsModule } from './trips/trips.module';
import { RoutesModule } from './routes/routes.module';
import { SettingModule } from './settings/setting.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { ReviewsModule } from './reviews/reviews.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    ClientsModule.registerAsync([
      {
        name: 'IDENTITY_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get<string>('IDENTITY_SERVICE_HOST') || 'localhost',
            port: configService.get<number>('IDENTITY_SERVICE_PORT') || 3001,
          },
        }),
      },
      {
        name: 'SUPPORT_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get<string>('SUPPORT_SERVICE_HOST') || 'localhost',
            port: configService.get<number>('SUPPORT_SERVICE_PORT') || 3002,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'TRIP_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('TRIP_SERVICE_HOST') || 'localhost',
            port: configService.get<number>('TRIP_SERVICE_PORT') || 3003,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'BOOKING_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get<string>('BOOKING_SERVICE_HOST') || 'localhost',
            port: configService.get<number>('BOOKING_SERVICE_PORT') || 3004,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'PAYMENT_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get<string>('PAYMENT_SERVICE_HOST') || 'localhost',
            port: configService.get<number>('PAYMENT_SERVICE_PORT') || 3005,
          },
        }),
        inject: [ConfigService],
      },
    ]),
    SharedAuthModule,
    AuthModule,
    UserModule,
    ActivityLogsModule,
    BusesModule,
    LocationModule,
    SettingModule,
    TripsModule,
    RoutesModule,
    BookingsModule,
    PaymentModule,
    NotificationsModule,
    ChatbotModule,
    ReviewsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class GatewayModule {}
