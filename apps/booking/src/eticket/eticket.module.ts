import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ETicketService } from './eticket.service';
import { ETicketController } from './eticket.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ClientsModule.register([
      {
        name: 'TRIP_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3003, // port Trip
        },
      },
    ]),
  ],
  controllers: [ETicketController],
  providers: [ETicketService],
  exports: [ETicketService],
})
export class ETicketModule {}
