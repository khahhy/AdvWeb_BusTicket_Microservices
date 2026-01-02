import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { IdentityModule } from './identity.module';
import { HttpToRpcExceptionFilter } from '@app/shared';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(IdentityModule);
  const configService = appContext.get(ConfigService);

  const redisHost = configService.get<string>('REDIS_HOST');
  const redisPort = configService.get<number>('REDIS_PORT');

  await appContext.close();

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    IdentityModule,
    {
      transport: Transport.REDIS,
      options: {
        host: redisHost,
        port: redisPort,
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
}
void bootstrap();
