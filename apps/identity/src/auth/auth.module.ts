import { Module } from '@nestjs/common';
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
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, GoogleAuthGuard],
  exports: [AuthService],
})
export class AuthModule {}
