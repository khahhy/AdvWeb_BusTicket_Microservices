import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { BookingModule } from './booking.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    BookingModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: 3004,
      },
    },
  );

  await app.listen();
  console.log('Booking Microservice is listening on port 3004');
}
void bootstrap();
