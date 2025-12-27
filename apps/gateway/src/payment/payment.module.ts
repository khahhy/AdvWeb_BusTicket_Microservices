import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PaymentController } from './payment.controller';

@Module({
  imports: [
    ClientsModule.register([
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
  controllers: [PaymentController],
})
export class PaymentModule {}
