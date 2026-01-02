import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
