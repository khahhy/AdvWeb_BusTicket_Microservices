import { Module } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { SettingModule } from 'src/setting/setting.module';
import { RoutesController } from './routes.controller';

@Module({
  imports: [SettingModule],
  controllers: [RoutesController],
  providers: [RoutesService],
})
export class RoutesModule {}
