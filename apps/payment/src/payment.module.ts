import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { PayOSModule } from './payos/payos.module';
import { PaymentsModule } from './payment/payments.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/payment/.env'],
    }),
    PrismaModule,
    PayOSModule,
    PaymentsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class PaymentModule {}
