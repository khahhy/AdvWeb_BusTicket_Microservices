import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class SignUpDto {
  @ApiProperty({
    example: 'Bocchi',
    description: 'Full name of the user',
  })
  @IsString()
  fullName: string;

  @ApiProperty({
    example: 'bocchi@gmail.com',
    description: 'Email of the user',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '+84123456789',
    description: 'Phone number of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    example: 'strongpasswordhash',
    description: 'Password of the user',
  })
  @IsString()
  @MinLength(6)
  password: string;
}
