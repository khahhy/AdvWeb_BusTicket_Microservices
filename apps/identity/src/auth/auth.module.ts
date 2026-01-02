import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from '../../../../libs/shared/src/auth/strategies/google.strategy';
import { GoogleAuthGuard } from '../../../../libs/shared/src/auth/guards/google-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedAuthModule } from '@app/shared';

@Module({
  imports: [
    PrismaModule,
    SharedAuthModule,
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
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, GoogleAuthGuard],
  exports: [AuthService],
})
export class AuthModule {}
