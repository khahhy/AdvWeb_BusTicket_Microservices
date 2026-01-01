import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ETicketService } from './eticket.service';
import { ETicketController } from './eticket.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ClientsModule.registerAsync([
      {
        name: 'TRIP_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('TRIP_SERVICE_HOST') || 'localhost',
            port: configService.get<number>('TRIP_SERVICE_PORT') || 3003,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [ETicketController],
  providers: [ETicketService],
  exports: [ETicketService],
})
export class ETicketModule {}
