import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { HttpToRpcExceptionFilter } from '@app/shared';
import { TripModule } from './trip.module';

async function bootstrap() {
  const app = await NestFactory.create(TripModule);
  const configService = app.get(ConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: {
      host: configService.get<string>('REDIS_HOST'),
      port: configService.get<number>('REDIS_PORT'),
    },
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new HttpToRpcExceptionFilter());

  await app.startAllMicroservices();

  const port = configService.get<number>('PORT') || 3003;
  await app.listen(port);
  console.log(`Trip Service is running on HTTP:${port} & Redis`);
}
void bootstrap();
