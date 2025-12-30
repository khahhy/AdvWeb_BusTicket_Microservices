import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewStatus } from '@app/shared/enums';

export class ReviewDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  bookingId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  userId: string;

  @ApiProperty({ example: 5, description: 'Rating from 1 to 5' })
  rating: number;

  @ApiPropertyOptional({
    example: 'Great trip, clean bus and friendly staff.',
  })
  comment?: string | null;

  @ApiProperty({ enum: ReviewStatus, example: ReviewStatus.visible })
  status: ReviewStatus;

  @ApiPropertyOptional({
    example: 'Contains prohibited terms: spam',
    description: 'Reason for flagging if flagged',
  })
  flaggedReason?: string | null;

  @ApiPropertyOptional({
    example: '2025-12-30T10:00:00.000Z',
    description: 'When the review was moderated by admin',
  })
  moderatedAt?: string | null;

  @ApiPropertyOptional({
    example: 'admin-user-id',
    description: 'Admin user ID who moderated',
  })
  moderatedBy?: string | null;

  @ApiProperty({ example: '2025-12-30T09:00:00.000Z' })
  createdAt: string;
}

export class AdminReviewDto extends ReviewDto {
  @ApiProperty({ example: 'John Doe' })
  userName: string;

  @ApiProperty({ example: 'Ho Chi Minh - Can Tho' })
  routeName: string;

  @ApiProperty({ example: '2025-12-30T08:00:00.000Z' })
  tripDate: string;
}

export class ReviewResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: ReviewDto })
  data: ReviewDto;
}

export class ReviewListResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: [ReviewDto] })
  data: ReviewDto[];
}

export class AdminReviewListResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: [AdminReviewDto] })
  data: AdminReviewDto[];
}
