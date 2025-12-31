import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from '@app/shared/dto';
import { ReviewStatus } from '@app/shared/enums';

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @MessagePattern({ cmd: 'create_review' })
  async create(@Payload() data: { userId: string; dto: CreateReviewDto }) {
    return this.reviewsService.create(data.userId, data.dto);
  }

  @MessagePattern({ cmd: 'find_review_by_booking' })
  async findByBooking(@Payload() data: { bookingId: string; userId: string }) {
    return this.reviewsService.findByBooking(data.bookingId, data.userId);
  }

  @MessagePattern({ cmd: 'find_reviews_by_user' })
  async findByUser(@Payload() userId: string) {
    return this.reviewsService.findByUser(userId);
  }

  @MessagePattern({ cmd: 'find_all_reviews_admin' })
  async findAllForAdmin() {
    return this.reviewsService.findAllForAdmin();
  }

  @MessagePattern({ cmd: 'moderate_review' })
  async moderateReview(
    @Payload()
    data: {
      reviewId: string;
      adminId: string;
      status: ReviewStatus;
    },
  ) {
    return this.reviewsService.moderateReview(
      data.reviewId,
      data.adminId,
      data.status,
    );
  }

  @MessagePattern({ cmd: 'delete_review' })
  async removeReview(@Payload() reviewId: string) {
    return this.reviewsService.removeReview(reviewId);
  }
}
