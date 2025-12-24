import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateLocationDto {
  @ApiProperty({
    example: 'Bến xe Miền Đông',
    description: 'Name of the location',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: '292 Đinh Bộ Lĩnh, P.26, Bình Thạnh, TP.HCM',
    description: 'Detail Address (Optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    example: 'TP.HCM',
    description: 'City name',
  })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({
    example: 10.762622,
    description: 'Latitude of the location',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({
    example: 106.660172,
    description: 'Longitude of the location',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
