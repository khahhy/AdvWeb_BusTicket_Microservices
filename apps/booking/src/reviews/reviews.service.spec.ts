import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { BookingStatus, ReviewStatus } from '@app/shared/enums';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    bookings: {
      findUnique: jest.fn(),
    },
    reviews: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a review successfully', async () => {
      const userId = 'user1';
      const dto = {
        bookingId: 'booking1',
        rating: 5,
        comment: 'Great service!',
      };

      const mockBooking = {
        id: 'booking1',
        userId: 'user1',
        status: BookingStatus.confirmed,
        tripId: 'trip1',
      };

      const mockReview = {
        id: 'review1',
        bookingId: 'booking1',
        userId: 'user1',
        rating: 5,
        comment: 'Great service!',
        status: ReviewStatus.visible,
        flaggedReason: null,
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.reviews.findFirst.mockResolvedValue(null);
      mockPrismaService.reviews.create.mockResolvedValue(mockReview);

      const result = await service.create(userId, dto);

      expect(result).toEqual({
        message: 'Review submitted successfully',
        data: mockReview,
      });
      expect(mockPrismaService.reviews.create).toHaveBeenCalled();
    });

    it('should flag review with prohibited terms', async () => {
      const userId = 'user1';
      const dto = {
        bookingId: 'booking1',
        rating: 1,
        comment: 'This is spam and a scam!',
      };

      const mockBooking = {
        id: 'booking1',
        userId: 'user1',
        status: BookingStatus.confirmed,
        tripId: 'trip1',
      };

      const mockReview = {
        id: 'review1',
        bookingId: 'booking1',
        userId: 'user1',
        rating: 1,
        comment: 'This is spam and a scam!',
        status: ReviewStatus.flagged,
        flaggedReason: 'Contains prohibited terms: spam, scam',
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.reviews.findFirst.mockResolvedValue(null);
      mockPrismaService.reviews.create.mockResolvedValue(mockReview);

      const result = await service.create(userId, dto);

      expect(result.data.status).toBe(ReviewStatus.flagged);
      expect(result.data.flaggedReason).toContain('prohibited terms');
    });

    it('should throw NotFoundException when booking not found', async () => {
      const userId = 'user1';
      const dto = {
        bookingId: 'booking1',
        rating: 5,
        comment: 'Great!',
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own booking', async () => {
      const userId = 'user1';
      const dto = {
        bookingId: 'booking1',
        rating: 5,
        comment: 'Great!',
      };

      const mockBooking = {
        id: 'booking1',
        userId: 'user2',
        status: BookingStatus.confirmed,
        tripId: 'trip1',
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);

      await expect(service.create(userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when booking is not confirmed', async () => {
      const userId = 'user1';
      const dto = {
        bookingId: 'booking1',
        rating: 5,
        comment: 'Great!',
      };

      const mockBooking = {
        id: 'booking1',
        userId: 'user1',
        status: BookingStatus.pendingPayment,
        tripId: 'trip1',
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when review already exists', async () => {
      const userId = 'user1';
      const dto = {
        bookingId: 'booking1',
        rating: 5,
        comment: 'Great!',
      };

      const mockBooking = {
        id: 'booking1',
        userId: 'user1',
        status: BookingStatus.confirmed,
        tripId: 'trip1',
      };

      const existingReview = {
        id: 'review1',
        bookingId: 'booking1',
        userId: 'user1',
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.reviews.findFirst.mockResolvedValue(existingReview);

      await expect(service.create(userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findByBooking', () => {
    it('should return review for a booking', async () => {
      const mockReview = {
        id: 'review1',
        bookingId: 'booking1',
        userId: 'user1',
        rating: 5,
      };

      mockPrismaService.reviews.findFirst.mockResolvedValue(mockReview);

      const result = await service.findByBooking('booking1', 'user1');

      expect(result).toEqual({
        message: 'Review retrieved successfully',
        data: mockReview,
      });
    });

    it('should throw NotFoundException when review not found', async () => {
      mockPrismaService.reviews.findFirst.mockResolvedValue(null);

      await expect(service.findByBooking('booking1', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByUser', () => {
    it('should return all reviews by user', async () => {
      const mockReviews = [
        { id: 'review1', userId: 'user1', rating: 5 },
        { id: 'review2', userId: 'user1', rating: 4 },
      ];

      mockPrismaService.reviews.findMany.mockResolvedValue(mockReviews);

      const result = await service.findByUser('user1');

      expect(result).toEqual({
        message: 'Reviews retrieved successfully',
        data: mockReviews,
      });
    });
  });

  describe('moderateReview', () => {
    it('should moderate a review successfully', async () => {
      const mockReview = {
        id: 'review1',
        status: ReviewStatus.flagged,
      };

      const updatedReview = {
        ...mockReview,
        status: ReviewStatus.visible,
        moderatedBy: 'admin1',
      };

      mockPrismaService.reviews.findFirst.mockResolvedValue(mockReview);
      mockPrismaService.reviews.update.mockResolvedValue(updatedReview);

      const result = await service.moderateReview(
        'review1',
        'admin1',
        ReviewStatus.visible,
      );

      expect(result).toEqual({
        message: 'Review moderated successfully',
        data: updatedReview,
      });
    });

    it('should throw NotFoundException when review not found', async () => {
      mockPrismaService.reviews.findFirst.mockResolvedValue(null);

      await expect(
        service.moderateReview('review1', 'admin1', ReviewStatus.visible),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeReview', () => {
    it('should delete a review successfully', async () => {
      const mockReview = { id: 'review1' };

      mockPrismaService.reviews.findFirst.mockResolvedValue(mockReview);
      mockPrismaService.reviews.delete.mockResolvedValue(mockReview);

      const result = await service.removeReview('review1');

      expect(result).toEqual({
        message: 'Review deleted successfully',
      });
      expect(mockPrismaService.reviews.delete).toHaveBeenCalledWith({
        where: { id: 'review1' },
      });
    });

    it('should throw NotFoundException when review not found', async () => {
      mockPrismaService.reviews.findFirst.mockResolvedValue(null);

      await expect(service.removeReview('review1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
