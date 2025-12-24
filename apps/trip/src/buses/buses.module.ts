import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BusesService } from './buses.service';
import { BusesController } from './buses.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisCacheModule } from '@app/shared';

@Module({
  imports: [
    PrismaModule,
    RedisCacheModule,
    ClientsModule.register([
      {
        name: 'SUPPORT_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3002, // port Support
        },
      },
    ]),
  ],
  controllers: [BusesController],
  providers: [BusesService],
})
export class BusesModule {}
