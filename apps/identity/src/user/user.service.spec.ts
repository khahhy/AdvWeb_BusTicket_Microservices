import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '@app/shared';
import { ClientProxy } from '@nestjs/microservices';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;
  let prismaService: PrismaService;
  let cacheManager: RedisCacheService;
  let supportClient: ClientProxy;
  let bookingClient: ClientProxy;

  const mockPrismaService = {
    users: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockClientProxy = {
    send: jest.fn(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisCacheService,
          useValue: mockCacheManager,
        },
        {
          provide: 'SUPPORT_SERVICE',
          useValue: mockClientProxy,
        },
        {
          provide: 'BOOKING_SERVICE',
          useValue: mockClientProxy,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheManager = module.get<RedisCacheService>(RedisCacheService);
    supportClient = module.get<ClientProxy>('SUPPORT_SERVICE');
    bookingClient = module.get<ClientProxy>('BOOKING_SERVICE');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        {
          id: '1',
          fullName: 'John Doe',
          email: 'john@example.com',
          phoneNumber: '1234567890',
          role: 'user',
          status: 'active',
          createdAt: new Date(),
        },
        {
          id: '2',
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          phoneNumber: '0987654321',
          role: 'user',
          status: 'active',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.users.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.users.count.mockResolvedValue(2);

      const query = { page: 1, limit: 10 };
      const result = await service.findAll(query);

      expect(result.message).toBe('Fetched users successfully');
      expect(result.data).toEqual(mockUsers);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter users by search term', async () => {
      const mockUsers = [
        {
          id: '1',
          fullName: 'John Doe',
          email: 'john@example.com',
        },
      ];

      mockPrismaService.users.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.users.count.mockResolvedValue(1);

      const query = { page: 1, limit: 10, search: 'John' };
      const result = await service.findAll(query);

      expect(result.data).toEqual(mockUsers);
      expect(mockPrismaService.users.findMany).toHaveBeenCalled();
    });

    it('should filter users by role', async () => {
      const mockUsers = [
        {
          id: '1',
          fullName: 'Admin User',
          role: 'admin',
        },
      ];

      mockPrismaService.users.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.users.count.mockResolvedValue(1);

      const query = { page: 1, limit: 10, role: 'admin' };
      const result = await service.findAll(query);

      expect(result.data).toEqual(mockUsers);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const mockUser = {
        id: '1',
        fullName: 'John Doe',
        email: 'john@example.com',
      };

      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('1');

      expect(result).toEqual({
        message: 'Fetched user successfully',
        data: mockUser,
      });
      expect(mockPrismaService.users.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update user profile', async () => {
      const mockUser = {
        id: '1',
        fullName: 'John Doe',
        email: 'john@example.com',
      };

      const updateDto = {
        fullName: 'John Updated',
        phoneNumber: '1234567890',
      };

      const updatedUser = {
        ...mockUser,
        ...updateDto,
      };

      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.users.update.mockResolvedValue(updatedUser);

      const result = await service.update('1', updateDto);

      expect(result.message).toBe('User updated successfully');
      expect(result.data).toEqual(updatedUser);
      expect(mockPrismaService.users.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(service.update('999', { fullName: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createAdmin', () => {
    it('should create admin user successfully', async () => {
      const dto = {
        email: 'admin@example.com',
        password: 'password123',
        fullName: 'Admin User',
        phoneNumber: '1234567890',
        role: 'admin' as const,
      };

      const hashedPassword = 'hashed_password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      mockPrismaService.users.findFirst.mockResolvedValue(null);
      mockPrismaService.users.create.mockResolvedValue({
        id: '1',
        ...dto,
        password: hashedPassword,
      });

      const result = await service.createAdmin(
        dto,
        'creator1',
        '127.0.0.1',
        'UA',
      );

      expect(result.message).toBe('Admin user created successfully');
      expect(mockPrismaService.users.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when email already exists', async () => {
      const dto = {
        email: 'admin@example.com',
        password: 'password123',
        fullName: 'Admin User',
        phoneNumber: '1234567890',
        role: 'admin' as const,
      };

      mockPrismaService.users.findFirst.mockResolvedValue({ id: '1' });

      await expect(
        service.createAdmin(dto, 'creator1', '127.0.0.1', 'UA'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
