import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { BusesModule } from './buses/buses.module';
import { LocationModule } from './location/location.module';
import { TripsModule } from './trips/trips.module';
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
    TripsModule,
    RoutesModule,
  ],
  controllers: [],
  providers: [],
})
export class TripModule {}
