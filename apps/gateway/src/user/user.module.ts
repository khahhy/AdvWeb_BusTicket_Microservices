import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserController } from './user.controller';

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
      },
    ]),
  ],
  controllers: [UserController],
})
export class UserModule {}
