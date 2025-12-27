import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { PaymentModule } from './payment.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    PaymentModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: 3005,
      },
    },
  );

  await app.listen();
  console.log('Payment Microservice is listening on port 3005');
}
void bootstrap();
