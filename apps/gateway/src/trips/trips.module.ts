import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TripsController } from './trips.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'TRIP_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3003,
        },
      },
    ]),
  ],
  controllers: [TripsController],
})
export class TripsModule {}
