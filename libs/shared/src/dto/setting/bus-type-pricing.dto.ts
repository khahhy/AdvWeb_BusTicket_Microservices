import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, IsOptional } from 'class-validator';

export class BusTypePricingDto {
  @ApiProperty({
    example: 1.0,
    description: 'Multiplier for Standard bus (usually 1.0)',
  })
  @IsNumber()
  @Min(0)
  standard: number;

  @ApiProperty({
    example: 1.2,
    description: 'Multiplier for VIP bus',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  vip: number;

  @ApiProperty({
    example: 1.5,
    description: 'Multiplier for Sleeper bus',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  sleeper: number;

  @ApiProperty({
    example: 1.8,
    description: 'Multiplier for Limousine bus',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  limousine: number;
}
