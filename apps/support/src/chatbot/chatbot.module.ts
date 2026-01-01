import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { GeminiService } from './gemini.service';

@Module({
  imports: [
    ConfigModule,
    ClientsModule.register([
      {
        name: 'TRIP_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.TRIP_SERVICE_HOST || 'localhost',
          port: parseInt(process.env.TRIP_SERVICE_PORT || '3003'),
          retryAttempts: 5,
          retryDelay: 1000,
        },
      },
      {
        name: 'BOOKING_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.BOOKING_SERVICE_HOST || 'localhost',
          port: parseInt(process.env.BOOKING_SERVICE_PORT || '3004'),
          retryAttempts: 5,
          retryDelay: 1000,
        },
      },
      {
        name: 'PAYMENT_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.PAYMENT_SERVICE_HOST || 'localhost',
          port: parseInt(process.env.PAYMENT_SERVICE_PORT || '3005'),
          retryAttempts: 5,
          retryDelay: 1000,
        },
      },
    ]),
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService, GeminiService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
