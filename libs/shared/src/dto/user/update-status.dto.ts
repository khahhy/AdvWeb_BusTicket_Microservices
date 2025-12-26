import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@app/shared/enums';

export class UpdateStatusDto {
  @ApiProperty({
    description: 'New status of the user',
    enum: UserStatus,
  })
  status: UserStatus;
}
