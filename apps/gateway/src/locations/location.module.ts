import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LocationsController } from './location.controller';

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
  controllers: [LocationsController],
})
export class LocationModule {}
