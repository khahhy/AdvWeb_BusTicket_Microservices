import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    notifications: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllForUser', () => {
    it('should return all notifications for a user', async () => {
      const mockNotifications = [
        {
          id: '1',
          userId: 'user1',
          type: 'email',
          content: 'Test notification 1',
          status: 'pending',
          createdAt: new Date(),
          bookingId: 'booking1',
        },
        {
          id: '2',
          userId: 'user1',
          type: 'email',
          content: 'Test notification 2',
          status: 'sent',
          createdAt: new Date(),
          bookingId: null,
        },
      ];

      mockPrismaService.notifications.findMany.mockResolvedValue(
        mockNotifications,
      );

      const result = await service.findAllForUser('user1');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', '1');
      expect(result[0]).toHaveProperty('isRead', false);
      expect(result[1]).toHaveProperty('isRead', true);
      expect(mockPrismaService.notifications.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a notification by id', async () => {
      const mockNotification = {
        id: '1',
        userId: 'user1',
        type: 'email',
        content: 'Test notification',
      };

      mockPrismaService.notifications.findUnique.mockResolvedValue(
        mockNotification,
      );

      const result = await service.findOne('1', 'user1');

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notifications.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when notification not found', async () => {
      mockPrismaService.notifications.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own notification', async () => {
      const mockNotification = {
        id: '1',
        userId: 'user2',
        type: 'email',
        content: 'Test notification',
      };

      mockPrismaService.notifications.findUnique.mockResolvedValue(
        mockNotification,
      );

      await expect(service.findOne('1', 'user1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotification = {
        id: '1',
        userId: 'user1',
        status: 'pending',
      };

      const updatedNotification = {
        ...mockNotification,
        status: 'sent',
      };

      mockPrismaService.notifications.findUnique.mockResolvedValue(
        mockNotification,
      );
      mockPrismaService.notifications.update.mockResolvedValue(
        updatedNotification,
      );

      const result = await service.markAsRead('1', 'user1');

      expect(result.status).toBe('sent');
      expect(mockPrismaService.notifications.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'sent' },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      mockPrismaService.notifications.updateMany.mockResolvedValue({
        count: 5,
      });

      const result = await service.markAllAsRead('user1');

      expect(result.count).toBe(5);
      expect(mockPrismaService.notifications.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user1', status: 'pending' },
        data: { status: 'sent' },
      });
    });
  });

  describe('delete', () => {
    it('should delete a notification', async () => {
      const mockNotification = {
        id: '1',
        userId: 'user1',
      };

      mockPrismaService.notifications.findUnique.mockResolvedValue(
        mockNotification,
      );
      mockPrismaService.notifications.delete.mockResolvedValue(
        mockNotification,
      );

      const result = await service.delete('1', 'user1');

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notifications.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when notification not found', async () => {
      mockPrismaService.notifications.findUnique.mockResolvedValue(null);

      await expect(service.delete('999', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
