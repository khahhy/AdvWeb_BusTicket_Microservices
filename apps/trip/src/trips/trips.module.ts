import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisCacheModule } from '@app/shared';

@Module({
  imports: [
    PrismaModule,
    RedisCacheModule,
    ClientsModule.register([
      {
        name: 'SUPPORT_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3002, // port Support
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
    ]),
  ],
  controllers: [TripsController],
  providers: [TripsService],
})
export class TripsModule {}
