import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail } from 'class-validator';

export class LookupBookingDto {
  @ApiProperty({
    example: 'nguyenva@gmail.com',
    description: 'Email used when booking',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '0909123456',
    description: 'Phone number used when booking',
  })
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;
}
