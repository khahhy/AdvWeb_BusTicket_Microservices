import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EmailModule,
  ],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
