import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { HttpToRpcExceptionFilter } from '@app/shared';
import { SupportModule } from './support.module';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(SupportModule);
  const configService = appContext.get(ConfigService);

  const port = configService.get<number>('SUPPORT_SERVICE_PORT') || 3002;

  await appContext.close();

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    SupportModule,
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
  console.log(`Support Microservice is listening on port ${port}`);
}
void bootstrap();
