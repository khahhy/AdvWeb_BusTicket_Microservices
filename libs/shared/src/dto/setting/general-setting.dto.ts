import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsString } from 'class-validator';

export class GeneralSettingsDto {
  @ApiProperty({
    example: '1900 8888',
    description: 'Public hotline number for customer support',
  })
  @IsString()
  hotline: string;

  @ApiProperty({
    example: 'support@vexereclone.com',
    description: 'Official contact email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: false,
    description: 'If true, the client app will show a 503 Maintenance screen',
  })
  @IsBoolean()
  maintenanceMode: boolean;
}
