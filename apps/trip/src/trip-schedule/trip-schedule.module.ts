import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TripScheduleService } from './trip-schedule.service';
import { TripScheduleController } from './trip-schedule.controller';
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
    ]),
  ],
  controllers: [TripScheduleController],
  providers: [TripScheduleService],
})
export class TripScheduleModule {}
