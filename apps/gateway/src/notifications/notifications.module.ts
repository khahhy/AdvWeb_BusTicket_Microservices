import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'TRIP_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3003,
        },
      },
    ]),
  ],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
