import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RedisCacheModule } from '@app/shared';
import { RoutesService } from './routes.service';
import { SettingModule } from '../setting/setting.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RoutesController } from './routes.controller';

@Module({
  imports: [
    PrismaModule,
    RedisCacheModule,
    SettingModule,
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
  controllers: [RoutesController],
  providers: [RoutesService],
})
export class RoutesModule {}
