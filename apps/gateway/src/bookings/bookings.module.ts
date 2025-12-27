import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BookingsController } from './bookings.controller';

@Module({
  imports: [
    ClientsModule.register([
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
  controllers: [BookingsController],
})
export class BookingsModule {}
