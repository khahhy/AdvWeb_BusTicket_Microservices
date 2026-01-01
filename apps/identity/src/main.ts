import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { IdentityModule } from './identity.module';
import { HttpToRpcExceptionFilter } from '@app/shared';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(IdentityModule);
  const configService = appContext.get(ConfigService);

  const port = configService.get<number>('IDENTITY_SERVICE_PORT') || 3001;

  await appContext.close();

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    IdentityModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: port,
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
  console.log(`Identity Microservice is listening on port ${port}`);
}
void bootstrap();
