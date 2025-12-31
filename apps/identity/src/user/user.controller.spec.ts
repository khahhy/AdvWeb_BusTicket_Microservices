import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from '@app/shared/dto';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  const mockUserService = {
    getStats: jest.fn(),
    createAdmin: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateRole: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStats', () => {
    it('should return user statistics', async () => {
      const expectedResult = {
        message: 'User statistics retrieved successfully',
        data: {
          totalUsers: 100,
          activeUsers: 80,
          adminUsers: 5,
        },
      };

      mockUserService.getStats.mockResolvedValue(expectedResult);

      const result = await controller.getStats();

      expect(result).toEqual(expectedResult);
      expect(service.getStats).toHaveBeenCalled();
    });
  });

  describe('createAdmin', () => {
    it('should create an admin user', async () => {
      const dto: CreateUserDto = {
        email: 'admin@example.com',
        password: 'password123',
        fullName: 'Admin User',
        phoneNumber: '1234567890',
        role: 'admin',
      };

      const payload = {
        dto,
        userId: 'creator1',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      const expectedResult = {
        message: 'Admin user created successfully',
        data: { id: '1', ...dto },
      };

      mockUserService.createAdmin.mockResolvedValue(expectedResult);

      const result = await controller.createAdmin(payload);

      expect(result).toEqual(expectedResult);
      expect(service.createAdmin).toHaveBeenCalledWith(
        dto,
        'creator1',
        '127.0.0.1',
        'Mozilla/5.0',
      );
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const query: QueryUserDto = { page: 1, limit: 10 };
      const expectedResult = {
        message: 'Fetched users successfully',
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };

      mockUserService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const expectedResult = {
        message: 'Fetched user successfully',
        data: { id: '1', email: 'user@example.com' },
      };

      mockUserService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne('1');

      expect(result).toEqual(expectedResult);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const dto: UpdateUserDto = {
        fullName: 'Updated Name',
        phoneNumber: '9876543210',
      };

      const payload = { id: '1', dto };

      const expectedResult = {
        message: 'User updated successfully',
        data: { id: '1', ...dto },
      };

      mockUserService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(payload);

      expect(result).toEqual(expectedResult);
      expect(service.update).toHaveBeenCalledWith('1', dto);
    });
  });

  describe('updateRole', () => {
    it('should update user role', async () => {
      const dto = { role: 'admin' as const };
      const payload = {
        id: '1',
        dto,
        userId: 'admin1',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      const expectedResult = {
        message: 'User role updated successfully',
        data: { id: '1', role: 'admin' },
      };

      mockUserService.updateRole.mockResolvedValue(expectedResult);

      const result = await controller.updateRole(payload);

      expect(result).toEqual(expectedResult);
      expect(service.updateRole).toHaveBeenCalledWith(
        '1',
        dto,
        'admin1',
        '127.0.0.1',
        'Mozilla/5.0',
      );
    });
  });

  describe('updateStatus', () => {
    it('should update user status', async () => {
      const dto = { status: 'active' as const };
      const payload = {
        id: '1',
        dto,
        userId: 'admin1',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      const expectedResult = {
        message: 'User status updated successfully',
        data: { id: '1', status: 'active' },
      };

      mockUserService.updateStatus.mockResolvedValue(expectedResult);

      const result = await controller.updateStatus(payload);

      expect(result).toEqual(expectedResult);
      expect(service.updateStatus).toHaveBeenCalledWith(
        '1',
        dto,
        'admin1',
        '127.0.0.1',
        'Mozilla/5.0',
      );
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      const payload = {
        id: '1',
        userId: 'admin1',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      const expectedResult = {
        message: 'User deleted successfully',
      };

      mockUserService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(payload);

      expect(result).toEqual(expectedResult);
      expect(service.remove).toHaveBeenCalledWith(
        '1',
        'admin1',
        '127.0.0.1',
        'Mozilla/5.0',
      );
    });
  });
});
