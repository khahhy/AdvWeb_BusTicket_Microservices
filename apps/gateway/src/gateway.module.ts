import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SharedAuthModule } from '@app/shared';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { BusesModule } from './buses/buses.module';

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
    ]),
    SharedAuthModule,
    AuthModule,
    UserModule,
    ActivityLogsModule,
    BusesModule,
  ],
  controllers: [],
  providers: [],
})
export class GatewayModule {}
