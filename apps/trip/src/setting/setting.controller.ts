import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SettingService } from './setting.service';
import { SettingKey } from '@app/shared/enums';
import { SettingsValueDto } from '@app/shared/type';

@Controller()
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @MessagePattern({ cmd: 'get_setting' })
  findOne(@Payload() key: SettingKey) {
    return this.settingService.findOne(key);
  }

  @MessagePattern({ cmd: 'upsert_setting' })
  upsert(
    @Payload()
    payload: {
      key: SettingKey;
      dto: SettingsValueDto;
      userId: string;
      ip: string;
      userAgent: string;
    },
  ) {
    return this.settingService.upsert(
      payload.key,
      payload.dto,
      payload.userId,
      payload.ip,
      payload.userAgent,
    );
  }
}
