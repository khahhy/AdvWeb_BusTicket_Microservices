import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GatewayType } from '@prisma/client-payment';

export class GatewayConfigDto {
  @ApiProperty({
    enum: GatewayType,
    example: GatewayType.momo,
    description: 'Payment provider type defined in database schema',
  })
  @IsEnum(GatewayType)
  provider: GatewayType;

  @ApiProperty({ example: true, description: 'Is this gateway active?' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    example: false,
    description: 'If true, uses sandbox/test environment URLs',
  })
  @IsBoolean()
  isSandbox: boolean;

  @ApiProperty({
    example: 'AIzaSy...',
    required: false,
    description: 'API Key, Client ID or Partner Code',
  })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiProperty({
    example: 's3cr3t...',
    required: false,
    description: 'Secret Key or Checksum Key',
  })
  @IsString()
  @IsOptional()
  secretKey?: string;
}

export class PaymentGatewaySettingsDto {
  @ApiProperty({
    type: [GatewayConfigDto],
    description: 'Configuration list for payment providers',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GatewayConfigDto)
  gateways: GatewayConfigDto[];
}
