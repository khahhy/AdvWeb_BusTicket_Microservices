import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateUserDto {
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
  phoneNumber?: string;

  @ApiProperty({
    example: 'strongpasswordhash',
    description: 'Hashed password of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  password?: string;
}
