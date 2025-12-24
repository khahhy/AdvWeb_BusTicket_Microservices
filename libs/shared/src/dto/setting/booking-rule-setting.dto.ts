import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';

export class BookingRulesSettingsDto {
  @ApiProperty({
    example: 15,
    description: 'Time in minutes to hold a seat before payment is required',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  paymentHoldTimeMinutes: number;

  @ApiProperty({
    example: 24,
    description: 'Minimum hours before departure allowed for cancellation',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  minCancellationHours: number;

  @ApiProperty({
    example: 85,
    description: 'Percentage of the ticket price to refund upon cancellation',
    minimum: 0,
    maximum: 100,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  refundPercentage: number;
}
