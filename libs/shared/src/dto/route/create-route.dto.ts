import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRouteDto {
  @ApiProperty({
    example: 'uuid-of-da-lat-location',
    description: 'ID of the origin location (Starting point)',
  })
  @IsNotEmpty()
  @IsUUID()
  originLocationId: string;

  @ApiProperty({
    example: 'uuid-of-sai-gon-location',
    description: 'ID of the destination location (End point)',
  })
  @IsNotEmpty()
  @IsUUID()
  destinationLocationId: string;

  @ApiProperty({
    example: 'Đường đèo, phong cảnh đẹp',
    description: 'Description of the route',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
