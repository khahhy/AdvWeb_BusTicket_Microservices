import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BookingsController } from './bookings.controller';
import { BookingOrchestrator } from './booking-orchestrator.service';
import { PaymentEventsListener } from './payment-events.listener';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'PAYMENT_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get<string>('PAYMENT_SERVICE_HOST') || 'localhost',
            port: configService.get<number>('PAYMENT_SERVICE_PORT') || 3005,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'BOOKING_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get<string>('BOOKING_SERVICE_HOST') || 'localhost',
            port: configService.get<number>('BOOKING_SERVICE_PORT') || 3004,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [BookingsController],
  providers: [BookingOrchestrator, PaymentEventsListener],
  exports: [BookingOrchestrator],
})
export class BookingsModule {}
