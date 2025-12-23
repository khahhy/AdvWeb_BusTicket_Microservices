import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class SignInDto {
  @ApiProperty({
    example: 'bocchi@gmail.com',
    description: 'Email of the user',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'strongpassword123',
    description: 'Password of the user',
  })
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
