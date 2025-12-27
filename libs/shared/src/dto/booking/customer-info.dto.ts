import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail } from 'class-validator';

export class CustomerInfoDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'nguyenva@gmail.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '0909123456' })
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @ApiProperty({ example: '079123456789' })
  @IsNotEmpty()
  @IsString()
  identificationCard: string;
}
