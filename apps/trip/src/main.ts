import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { HttpToRpcExceptionFilter } from '@app/shared';
import { TripModule } from './trip.module';

async function bootstrap() {
  const logger = new Logger('TripMain');
  logger.log('Starting Trip Microservice...');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    TripModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: 3003,
      },
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpToRpcExceptionFilter());

  await app.listen();
  logger.log('Trip Microservice is listening on port 3003');
  logger.log('Trip Microservice is ready to accept connections');
}
void bootstrap();
