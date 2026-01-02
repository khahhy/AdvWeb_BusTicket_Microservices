import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { HttpToRpcExceptionFilter } from '@app/shared';
import { SupportModule } from './support.module';

async function bootstrap() {
  const app = await NestFactory.create(SupportModule);
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

  const port = configService.get<number>('PORT') || 3002;
  await app.listen(port);
  console.log(`Support Service is running on HTTP:${port} & Redis`);
}
void bootstrap();
