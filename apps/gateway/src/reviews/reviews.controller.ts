import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CreateReviewDto, ModerateReviewDto } from '@app/shared/dto';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  UserRole,
  type RequestWithUser,
} from '@app/shared';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a review for a completed booking' })
  @ApiResponse({ status: 201, description: 'Review submitted successfully.' })
  @ApiResponse({ status: 400, description: 'Booking not completed.' })
  @ApiResponse({ status: 403, description: 'Not allowed to review booking.' })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  @ApiResponse({ status: 409, description: 'Review already exists.' })
  @Post()
  async create(
    @Req() req: RequestWithUser,
    @Body() createReviewDto: CreateReviewDto,
  ): Promise<unknown> {
    try {
      const result: unknown = await firstValueFrom(
        this.bookingClient.send(
          { cmd: 'create_review' },
          { userId: req.user.userId, dto: createReviewDto },
        ),
      );
      return result;
    } catch (error) {
      const err = error as { message?: string; status?: number };
      throw new HttpException(
        err.message || 'Failed to create review',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user review for a booking' })
  @ApiParam({ name: 'bookingId', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Fetched review successfully.' })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  @Get('booking/:bookingId')
  async findByBooking(
    @Param('bookingId') bookingId: string,
    @Req() req: RequestWithUser,
  ): Promise<unknown> {
    try {
      const result: unknown = await firstValueFrom(
        this.bookingClient.send(
          { cmd: 'find_review_by_booking' },
          { bookingId, userId: req.user.userId },
        ),
      );
      return result;
    } catch (error) {
      const err = error as { message?: string; status?: number };
      throw new HttpException(
        err.message || 'Failed to fetch review',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all reviews by current user' })
  @ApiResponse({ status: 200, description: 'Fetched reviews successfully.' })
  @Get('my')
  async findMyReviews(@Req() req: RequestWithUser): Promise<unknown> {
    try {
      const result: unknown = await firstValueFrom(
        this.bookingClient.send(
          { cmd: 'find_reviews_by_user' },
          req.user.userId,
        ),
      );
      return result;
    } catch (error) {
      const err = error as { message?: string; status?: number };
      throw new HttpException(
        err.message || 'Failed to fetch reviews',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Get all reviews for moderation' })
  @ApiResponse({ status: 200, description: 'Fetched reviews successfully.' })
  @Get('admin')
  async findAllForAdmin(): Promise<unknown> {
    try {
      const result: unknown = await firstValueFrom(
        this.bookingClient.send({ cmd: 'find_all_reviews_admin' }, {}),
      );
      return result;
    } catch (error) {
      const err = error as { message?: string; status?: number };
      throw new HttpException(
        err.message || 'Failed to fetch reviews',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Moderate a review' })
  @ApiResponse({ status: 200, description: 'Review moderated successfully.' })
  @Patch(':id/moderate')
  async moderateReview(
    @Param('id') id: string,
    @Body() dto: ModerateReviewDto,
    @Req() req: RequestWithUser,
  ): Promise<unknown> {
    try {
      const result: unknown = await firstValueFrom(
        this.bookingClient.send(
          { cmd: 'moderate_review' },
          { reviewId: id, adminId: req.user.userId, status: dto.status },
        ),
      );
      return result;
    } catch (error) {
      const err = error as { message?: string; status?: number };
      throw new HttpException(
        err.message || 'Failed to moderate review',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Delete a review' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully.' })
  @Delete(':id')
  async removeReview(@Param('id') id: string): Promise<unknown> {
    try {
      const result: unknown = await firstValueFrom(
        this.bookingClient.send({ cmd: 'delete_review' }, id),
      );
      return result;
    } catch (error) {
      const err = error as { message?: string; status?: number };
      throw new HttpException(
        err.message || 'Failed to delete review',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
