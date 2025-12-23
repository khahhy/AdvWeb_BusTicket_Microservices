import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@app/shared/enums/user-role.enum';

export class UpdateRoleDto {
  @ApiProperty({
    description: 'New role of the user',
    enum: UserRole,
  })
  role: UserRole;
}
