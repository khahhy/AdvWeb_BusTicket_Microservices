import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentGateway } from './payment.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { PayOSModule } from '../payos/payos.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PayOSModule,
    ClientsModule.register([
      {
        name: 'BOOKING_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.BOOKING_SERVICE_HOST || 'localhost',
          port: Number(process.env.BOOKING_SERVICE_PORT) || 3004,
        },
      },
      {
        name: 'SUPPORT_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.SUPPORT_SERVICE_HOST || 'localhost',
          port: Number(process.env.SUPPORT_SERVICE_PORT) || 3003,
        },
      },
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentGateway],
  exports: [PaymentService],
})
export class PaymentsModule {}
