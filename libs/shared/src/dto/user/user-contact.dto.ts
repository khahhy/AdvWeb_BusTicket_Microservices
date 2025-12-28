import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail, IsOptional } from 'class-validator';

export class UserContactDto {
  @ApiProperty({
    example: 'uuid-v4-string',
    description: 'Unique identifier of the user',
  })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty({
    example: 'Bocchi',
    description: 'Full name of the user',
  })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({
    example: 'bocchi@gmail.com',
    description: 'Email of the user',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '+84123456789',
    description: 'Phone number of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string | null;

  @ApiProperty({
    example: { email: true, sms: false },
    description: 'Notification preferences of the user',
  })
  @IsOptional()
  notificationPreferences: unknown;

  @ApiProperty({
    example: 'active',
    description: 'Status of the user',
  })
  @IsNotEmpty()
  @IsString()
  status: string;

  @ApiProperty({
    example: 'admin',
    description: 'Role of the user',
  })
  @IsNotEmpty()
  @IsString()
  role: string;
}
