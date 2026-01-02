import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocationsService } from './location.service';
import { LocationsController } from './location.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisCacheModule } from '@app/shared';

@Module({
  imports: [
    PrismaModule,
    RedisCacheModule,
    ClientsModule.registerAsync([
      {
        name: 'SUPPORT_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: configService.get<string>('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationModule {}
