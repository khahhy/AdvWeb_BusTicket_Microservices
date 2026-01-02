import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'IDENTITY_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get<string>('IDENTITY_SERVICE_HOST') || 'localhost',
            port: configService.get<number>('IDENTITY_SERVICE_PORT') || 3001,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'SUPPORT_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get<string>('SUPPORT_SERVICE_HOST') || 'localhost',
            port: configService.get<number>('SUPPORT_SERVICE_PORT') || 3002,
          },
        }),
        inject: [ConfigService],
      },
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
    ]),
  ],
  providers: [HealthService],
  controllers: [HealthController],
})
export class HealthModule {}
