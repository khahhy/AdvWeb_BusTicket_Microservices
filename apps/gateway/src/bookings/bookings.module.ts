import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BookingsController } from './bookings.controller';
import { BookingOrchestrator } from './booking-orchestrator.service';
import { PaymentEventsListener } from './payment-events.listener';

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
      {
        name: 'PAYMENT_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3005,
        },
      },
    ]),
  ],
  controllers: [BookingsController],
  providers: [BookingOrchestrator, PaymentEventsListener],
  exports: [BookingOrchestrator],
})
export class BookingsModule {}
