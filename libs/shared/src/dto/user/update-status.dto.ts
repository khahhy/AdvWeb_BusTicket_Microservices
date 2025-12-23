import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@app/shared/enums/user-status.enum';

export class UpdateStatusDto {
  @ApiProperty({
    description: 'New status of the user',
    enum: UserStatus,
  })
  status: UserStatus;
}
