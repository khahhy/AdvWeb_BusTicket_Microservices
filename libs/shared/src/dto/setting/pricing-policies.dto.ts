import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max } from 'class-validator';

export class PricingPoliciesDto {
  @ApiProperty({
    example: 1400,
    description: 'Base price per kilometer (VND)',
  })
  @IsNumber()
  @Min(0)
  pricePerKm: number;

  @ApiProperty({
    example: 0.05,
    description: 'Surcharge for weekends (0.05 = 5%)',
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  weekendSurcharge: number;

  @ApiProperty({
    example: 0.1,
    description: 'Surcharge for holidays (0.1 = 10%)',
  })
  @IsNumber()
  @Min(0)
  holidaySurcharge: number;
}
