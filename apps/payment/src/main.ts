import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { HttpToRpcExceptionFilter } from '@app/shared';
import { PaymentModule } from './payment.module';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(PaymentModule);
  const configService = appContext.get(ConfigService);

  const port = configService.get<number>('PAYMENT_SERVICE_PORT') || 3005;

  await appContext.close();

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    PaymentModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: port,
      },
    },
  );

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new HttpToRpcExceptionFilter());

  await app.listen();
  console.log(`Payment Microservice is listening on port ${port}`);
}
void bootstrap();
