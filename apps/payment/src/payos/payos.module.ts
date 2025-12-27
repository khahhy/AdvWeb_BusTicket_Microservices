import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PayOSService } from './payos.service';

@Module({
  imports: [ConfigModule],
  providers: [PayOSService],
  exports: [PayOSService],
})
export class PayOSModule {}
