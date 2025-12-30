import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Booking ID to review',
    example: '6a3f6b9a-2e9b-4f1a-8c2a-2ad7f0f1f3a1',
  })
  @IsUUID()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({
    description: 'Overall rating (1-5)',
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    description: 'Optional comment',
    example: 'Great trip, clean bus and friendly staff.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
