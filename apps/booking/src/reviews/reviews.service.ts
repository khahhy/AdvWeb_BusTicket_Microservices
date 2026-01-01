import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from '@app/shared/dto';
import { BookingStatus, ReviewStatus } from '@app/shared/enums';

const PROHIBITED_TERMS = [
  'spam',
  'scam',
  'fraud',
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'piss',
  'cunt',
  'whore',
  'slut',
];

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findProhibitedTerms = (comment: string) =>
  PROHIBITED_TERMS.filter((term) => {
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
    return regex.test(comment);
  });

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: dto.bookingId },
      select: {
        id: true,
        userId: true,
        status: true,
        tripId: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (!booking.userId || booking.userId !== userId) {
      throw new ForbiddenException('You can only review your own booking');
    }

    if (booking.status !== (BookingStatus.confirmed as string)) {
      throw new BadRequestException('Only confirmed bookings can be reviewed');
    }

    // Check if trip has completed (you might need to fetch trip details if needed)
    // For now, we'll skip trip completion check or add it based on your requirements

    const existingReview = await this.prisma.reviews.findFirst({
      where: { bookingId: dto.bookingId, userId },
    });

    if (existingReview) {
      throw new ConflictException('Review already submitted for this booking');
    }

    const trimmedComment = dto.comment?.trim();
    const matchedTerms = trimmedComment
      ? findProhibitedTerms(trimmedComment)
      : [];
    const shouldFlag = matchedTerms.length > 0;

    const review = await this.prisma.reviews.create({
      data: {
        bookingId: dto.bookingId,
        userId: userId,
        rating: dto.rating,
        comment: trimmedComment?.length ? trimmedComment : null,
        status: shouldFlag ? ReviewStatus.flagged : ReviewStatus.visible,
        flaggedReason: shouldFlag
          ? `Contains prohibited terms: ${matchedTerms.join(', ')}`
          : null,
      },
    });

    return { message: 'Review submitted successfully', data: review };
  }

  async findByBooking(bookingId: string, userId: string) {
    const review = await this.prisma.reviews.findFirst({
      where: { bookingId, userId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return { message: 'Fetched review successfully', data: review };
  }

  async findByUser(userId: string) {
    const reviews = await this.prisma.reviews.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return { message: 'Fetched reviews successfully', data: reviews };
  }

  async findAllForAdmin() {
    const reviews = await this.prisma.reviews.findMany({
      include: {
        booking: {
          select: {
            id: true,
            userId: true,
            tripId: true,
            routeId: true,
            customerInfo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to match admin format
    const data = reviews.map((review) => {
      const customerInfo = review.booking?.customerInfo as {
        fullName?: string;
        email?: string;
      } | null;
      return {
        id: review.id,
        bookingId: review.bookingId,
        userId: review.userId,
        userName:
          customerInfo?.fullName || customerInfo?.email || 'Unknown Passenger',
        routeName: 'Route Info Not Available', // You may need to join route data
        tripDate: new Date().toISOString(), // You may need to join trip data
        rating: review.rating,
        comment: review.comment ?? '',
        createdAt: review.createdAt.toISOString(),
        status: review.status,
        flaggedReason: review.flaggedReason,
        moderatedAt: review.moderatedAt?.toISOString() || null,
        moderatedBy: review.moderatedBy ?? null,
      };
    });

    return { message: 'Fetched reviews successfully', data };
  }

  async moderateReview(
    reviewId: string,
    adminId: string,
    status: ReviewStatus,
  ) {
    const review = await this.prisma.reviews.findUnique({
      where: { id: reviewId },
      select: { id: true },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const updated = await this.prisma.reviews.update({
      where: { id: reviewId },
      data: {
        status,
        moderatedAt: new Date(),
        moderatedBy: adminId,
      },
    });

    return { message: 'Review moderated successfully', data: updated };
  }

  async removeReview(reviewId: string) {
    const review = await this.prisma.reviews.findUnique({
      where: { id: reviewId },
      select: { id: true },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.prisma.reviews.delete({ where: { id: reviewId } });

    return { message: 'Review deleted successfully' };
  }

  async findByRoute(routeId: string) {
    const reviews = await this.prisma.reviews.findMany({
      where: {
        booking: {
          routeId: routeId,
        },
        status: ReviewStatus.visible, // Only show visible reviews
      },
      include: {
        booking: {
          select: {
            customerInfo: true,
            tripId: true,
            routeId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to latest 50 reviews
    });

    const data = reviews.map((review) => {
      const customerInfo = review.booking?.customerInfo as {
        fullName?: string;
        email?: string;
      } | null;
      return {
        id: review.id,
        userId: review.userId,
        userName:
          customerInfo?.fullName || customerInfo?.email || 'Anonymous User',
        rating: review.rating,
        comment: review.comment ?? '',
        createdAt: review.createdAt.toISOString(),
      };
    });

    return { message: 'Fetched reviews successfully', data };
  }
}
