import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateRouteDto } from './create-route.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateRouteDto extends PartialType(CreateRouteDto) {
  @ApiProperty({
    example: true,
    description: 'Status of the route',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
