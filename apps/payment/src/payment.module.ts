import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { PayOSModule } from './payos/payos.module';
import { PaymentsModule } from './payment/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/payment/.env'],
    }),
    PrismaModule,
    PayOSModule,
    PaymentsModule,
  ],
  controllers: [],
  providers: [],
})
export class PaymentModule {}
