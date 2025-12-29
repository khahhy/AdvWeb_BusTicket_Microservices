import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingsGateway } from './bookings.gateway';
import { ETicketModule } from '../eticket/eticket.module';
import { ETicketController } from '../eticket/eticket.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ETicketModule,
    ClientsModule.register([
      {
        name: 'IDENTITY_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.IDENTITY_SERVICE_HOST || 'localhost',
          port: Number(process.env.IDENTITY_SERVICE_PORT) || 3001,
        },
      },
      {
        name: 'TRIP_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.TRIP_SERVICE_HOST || 'localhost',
          port: Number(process.env.TRIP_SERVICE_PORT) || 3003,
        },
      },
      {
        name: 'SUPPORT_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.SUPPORT_SERVICE_HOST || 'localhost',
          port: Number(process.env.SUPPORT_SERVICE_PORT) || 3002,
        },
      },
    ]),
  ],
  controllers: [BookingsController, ETicketController],
  providers: [BookingsService, BookingsGateway],
  exports: [BookingsService],
})
export class BookingsModule {}
