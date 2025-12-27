import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus, AuthProvider } from '@app/shared/enums';

export class UserDto {
  @ApiProperty({
    example: 'd3fdd4f5-4a9a-42f6-95a6-a6fce2dd01eb',
    description: 'Unique identifier of the user (UUID)',
  })
  id: string;

  @ApiProperty({
    example: 'email@gmail.com',
    description: 'User email address',
  })
  email: string;

  @ApiProperty({
    example: 'namemmm',
    description: 'Full name of the user',
  })
  fullName: string;

  @ApiProperty({
    example: '0123456789',
    description: 'Phone number',
    required: false,
  })
  phoneNumber: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.passenger,
    description: 'Role of the user in the system',
  })
  role: UserRole | string;

  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.active,
    description: 'Current status of the account',
  })
  status: UserStatus | string;

  @ApiProperty({
    example: true,
    description: 'Whether the email has been verified',
  })
  emailVerified: boolean;

  @ApiProperty({
    enum: AuthProvider,
    example: AuthProvider.local,
    description: 'Authentication provider (local, google, etc.)',
  })
  authProvider: AuthProvider | string;

  @ApiProperty({
    example: '2025-12-06T11:16:09.448Z',
    description: 'Timestamp when the account was created',
  })
  createdAt: Date;
}
