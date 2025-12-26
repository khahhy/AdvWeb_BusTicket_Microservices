import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { BusesModule } from './buses/buses.module';
import { LocationModule } from './location/location.module';
import { TripScheduleModule } from './trip-schedule/trip-schedule.module';
import { RoutesModule } from './routes/routes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/trip/.env'],
    }),
    PrismaModule,
    BusesModule,
    LocationModule,
    TripScheduleModule,
    RoutesModule,
  ],
  controllers: [],
  providers: [],
})
export class TripModule {}
