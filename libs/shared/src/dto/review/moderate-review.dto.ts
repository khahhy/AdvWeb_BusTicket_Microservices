import { ApiProperty } from '@nestjs/swagger';
import { ReviewStatus } from '@app/shared/enums';
import { IsEnum } from 'class-validator';

export class ModerateReviewDto {
  @ApiProperty({
    description: 'Updated review status',
    enum: ReviewStatus,
    example: ReviewStatus.hidden,
  })
  @IsEnum(ReviewStatus)
  status: ReviewStatus;
}
