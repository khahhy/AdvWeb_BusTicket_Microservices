import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { BookingModule } from 'apps/booking/src/booking.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    ClientsModule.register([
      {
        name: 'IDENTITY_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3001,
        },
      },
      {
        name: 'SUPPORT_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3002,
        },
      },
      {
        name: 'TRIP_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3003,
        },
      },
      {
        name: 'BOOKING_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3004,
        },
      },
      {
        name: 'PAYMENT_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3005,
        },
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
    BookingModule,
    PaymentModule,
  ],
  controllers: [],
  providers: [],
})
export class GatewayModule {}
