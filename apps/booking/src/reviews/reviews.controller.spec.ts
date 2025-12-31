import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from '@app/shared/dto';
import { ReviewStatus } from '@app/shared/enums';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let service: ReviewsService;

  const mockReviewsService = {
    create: jest.fn(),
    findByBooking: jest.fn(),
    findByUser: jest.fn(),
    findAllForAdmin: jest.fn(),
    moderateReview: jest.fn(),
    removeReview: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        {
          provide: ReviewsService,
          useValue: mockReviewsService,
        },
      ],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
    service = module.get<ReviewsService>(ReviewsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a review', async () => {
      const dto: CreateReviewDto = {
        bookingId: 'booking1',
        rating: 5,
        comment: 'Great service!',
      };

      const payload = {
        userId: 'user1',
        dto,
      };

      const expectedResult = {
        message: 'Review submitted successfully',
        data: { id: 'review1', ...dto, userId: 'user1' },
      };

      mockReviewsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(payload);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith('user1', dto);
    });
  });

  describe('findByBooking', () => {
    it('should find review by booking', async () => {
      const payload = {
        bookingId: 'booking1',
        userId: 'user1',
      };

      const expectedResult = {
        message: 'Review retrieved successfully',
        data: { id: 'review1', bookingId: 'booking1' },
      };

      mockReviewsService.findByBooking.mockResolvedValue(expectedResult);

      const result = await controller.findByBooking(payload);

      expect(result).toEqual(expectedResult);
      expect(service.findByBooking).toHaveBeenCalledWith('booking1', 'user1');
    });
  });

  describe('findByUser', () => {
    it('should find reviews by user', async () => {
      const expectedResult = {
        message: 'Reviews retrieved successfully',
        data: [{ id: 'review1', userId: 'user1' }],
      };

      mockReviewsService.findByUser.mockResolvedValue(expectedResult);

      const result = await controller.findByUser('user1');

      expect(result).toEqual(expectedResult);
      expect(service.findByUser).toHaveBeenCalledWith('user1');
    });
  });

  describe('findAllForAdmin', () => {
    it('should find all reviews for admin', async () => {
      const expectedResult = {
        message: 'Reviews retrieved successfully',
        data: [],
      };

      mockReviewsService.findAllForAdmin.mockResolvedValue(expectedResult);

      const result = await controller.findAllForAdmin();

      expect(result).toEqual(expectedResult);
      expect(service.findAllForAdmin).toHaveBeenCalled();
    });
  });

  describe('moderateReview', () => {
    it('should moderate a review', async () => {
      const payload = {
        reviewId: 'review1',
        adminId: 'admin1',
        status: ReviewStatus.visible,
      };

      const expectedResult = {
        message: 'Review moderated successfully',
        data: { id: 'review1', status: ReviewStatus.visible },
      };

      mockReviewsService.moderateReview.mockResolvedValue(expectedResult);

      const result = await controller.moderateReview(payload);

      expect(result).toEqual(expectedResult);
      expect(service.moderateReview).toHaveBeenCalledWith(
        'review1',
        'admin1',
        ReviewStatus.visible,
      );
    });
  });

  describe('removeReview', () => {
    it('should remove a review', async () => {
      const expectedResult = {
        message: 'Review deleted successfully',
      };

      mockReviewsService.removeReview.mockResolvedValue(expectedResult);

      const result = await controller.removeReview('review1');

      expect(result).toEqual(expectedResult);
      expect(service.removeReview).toHaveBeenCalledWith('review1');
    });
  });
});
