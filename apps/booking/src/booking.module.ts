import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ETicketModule } from './eticket/eticket.module';
import { BookingsModule } from './booking/bookings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { RedisCacheModule } from '@app/shared';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/booking/.env'],
    }),
    PrismaModule,
    RedisCacheModule,
    ETicketModule,
    BookingsModule,
    ReviewsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class BookingModule {}
