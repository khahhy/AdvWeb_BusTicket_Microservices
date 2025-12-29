import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client-identity';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '@app/shared';
import { hash } from 'bcrypt';
import type {
  CreateUserDto,
  UpdateUserDto,
  UpdateRoleDto,
  UpdateStatusDto,
  QueryUserDto,
} from '@app/shared/dto';
import { UserStatsData } from '@app/shared/type';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('SUPPORT_SERVICE') private readonly supportClient: ClientProxy,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    private readonly cacheManager: RedisCacheService,
  ) {}

  async findAll(query: QueryUserDto) {
    try {
      const { page = 1, limit = 10, search, role } = query;
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where: Prisma.UsersWhereInput = {
        AND: [
          role ? { role: role } : {},
          search
            ? {
                OR: [
                  { fullName: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {},
        ],
      };

      const [users, total] = await Promise.all([
        this.prisma.users.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },

          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            role: true,
            status: true,
            createdAt: true,
            // _count: { select: { bookings: true } },
          },
        }),
        this.prisma.users.count({ where }),
      ]);

      const totalPages = Math.ceil(total / take);

      return {
        message: 'Fetched users successfully',
        data: users,
        meta: {
          total,
          page: Number(page),
          limit: Number(take),
          totalPages,
        },
      };
    } catch (err) {
      console.error('Error in UserService.findAll:', err);
      throw new InternalServerErrorException('Failed to fetch users', {
        cause: err,
      });
    }
  }

  async findOne(id: string) {
    try {
      const user = await this.prisma.users.findUnique({ where: { id } });
      if (!user) throw new NotFoundException('User not found');
      return { message: 'Fetched user successfully', data: user };
    } catch (err) {
      console.error('Error in UserService.findOne:', err);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to fetch user');
    }
  }

  async createAdmin(
    dto: CreateUserDto,
    userId: string,
    ip: string,
    userAgent: string,
  ) {
    try {
      const existing = await this.prisma.users.findUnique({
        where: { email: dto.email },
      });
      if (existing) throw new BadRequestException('Email already exists');

      if (dto.phoneNumber) {
        const phoneExist = await this.prisma.users.findUnique({
          where: { phoneNumber: dto.phoneNumber },
        });
        if (phoneExist)
          throw new BadRequestException('Phone number already exists');
      }

      if (!dto.password) {
        throw new BadRequestException('Password is required for Admin account');
      }

      const hashedPassword = await hash(dto.password, 10);

      const newUser = await this.prisma.users.create({
        data: {
          fullName: dto.fullName,
          email: dto.email,
          phoneNumber: dto.phoneNumber ?? null,
          password: hashedPassword,
          authProvider: 'local',
          role: 'admin',
          status: 'active',
          emailVerified: true,
        },
      });

      await lastValueFrom(
        this.supportClient.emit('log_activity', {
          userId: userId,
          action: 'CREATE_ADMIN',
          entityType: 'Users',
          entityId: newUser.id,
          metadata: {
            userId: newUser.id,
            email: newUser.email,
          },
          ipAddress: ip,
          userAgent: userAgent,
        }),
      );

      return { message: 'Admin created successfully', data: newUser };
    } catch (err) {
      console.error('Error in UserService.createAdmin:', err);
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Failed to create admin');
    }
  }

  async update(id: string, dto: UpdateUserDto) {
    try {
      const user = await this.prisma.users.findUnique({ where: { id } });
      if (!user) throw new NotFoundException('User not found');

      if (dto.email && dto.email !== user.email) {
        const exist = await this.prisma.users.findUnique({
          where: { email: dto.email },
        });
        if (exist) throw new BadRequestException('Email already in use');
      }

      if (
        dto.phoneNumber !== undefined &&
        dto.phoneNumber !== user.phoneNumber
      ) {
        if (dto.phoneNumber !== null) {
          const phoneExist = await this.prisma.users.findUnique({
            where: { phoneNumber: dto.phoneNumber },
          });
          if (phoneExist)
            throw new BadRequestException('Phone number already in use');
        }
      }

      const updatedUser = await this.prisma.users.update({
        where: { id },
        data: {
          fullName: dto.fullName ?? user.fullName,
          email: dto.email ?? user.email,
          phoneNumber:
            dto.phoneNumber === undefined ? user.phoneNumber : dto.phoneNumber,
        },
      });

      return { message: 'User updated successfully', data: updatedUser };
    } catch (err) {
      console.error('Error in UserService.findAll:', err);
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      )
        throw err;
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  async updateRole(
    id: string,
    dto: UpdateRoleDto,
    userId: string,
    ip: string,
    userAgent: string,
  ) {
    try {
      const user = await this.prisma.users.findUnique({ where: { id } });
      if (!user) throw new NotFoundException('User not found');

      const updatedUser = await this.prisma.users.update({
        where: { id },
        data: { role: dto.role },
      });

      await lastValueFrom(
        this.supportClient.emit('log_activity', {
          userId: userId,
          action: 'UPDATE_ROLE_USER',
          entityType: 'Users',
          entityId: updatedUser.id,
          metadata: {
            userId: updatedUser.id,
            email: updatedUser.email,
          },
          ipAddress: ip,
          userAgent: userAgent,
        }),
      );

      return { message: 'User role updated successfully', data: updatedUser };
    } catch (err) {
      console.error('Error in UserService.findAll:', err);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to update role');
    }
  }

  async updateStatus(
    id: string,
    dto: UpdateStatusDto,
    userId: string,
    ip: string,
    userAgent: string,
  ) {
    try {
      const user = await this.prisma.users.findUnique({ where: { id } });
      if (!user) throw new NotFoundException('User not found');

      const updatedUser = await this.prisma.users.update({
        where: { id },
        data: { status: dto.status },
      });

      await lastValueFrom(
        this.supportClient.emit('log_activity', {
          userId: userId,
          action: 'UPDATE_STATUS_USER',
          entityType: 'Users',
          entityId: updatedUser.id,
          metadata: {
            userId: updatedUser.id,
            status: updatedUser.status,
          },
          ipAddress: ip,
          userAgent: userAgent,
        }),
      );

      return { message: 'User status updated successfully', data: updatedUser };
    } catch (err) {
      console.error('Error in UserService.findAll:', err);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to update status');
    }
  }

  async remove(id: string, userId: string, ip: string, userAgent: string) {
    try {
      const user = await this.prisma.users.findUnique({ where: { id } });
      if (!user) throw new NotFoundException('User not found');

      const deletedUser = await this.prisma.users.delete({ where: { id } });

      await lastValueFrom(
        this.supportClient.emit('log_activity', {
          userId: userId,
          action: 'DELETE_USER',
          entityType: 'Users',
          entityId: deletedUser.id,
          metadata: {
            userId: deletedUser.id,
          },
          ipAddress: ip,
          userAgent: userAgent,
        }),
      );

      return { message: 'User deleted successfully', data: deletedUser };
    } catch (err) {
      console.error('Error in UserService.findAll:', err);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to delete user');
    }
  }

  async getStats() {
    try {
      const cacheKey = 'admin:user-stats';

      const cachedData = await this.cacheManager.get<UserStatsData>(cacheKey);

      if (cachedData) {
        return {
          message: 'Fetched user stats successfully (from cache)',
          data: cachedData,
        };
      }
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const startOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );

      const userFilter: Prisma.UsersWhereInput = {
        role: { not: 'admin' },
      };

      const totalUsers = await this.prisma.users.count({
        where: userFilter,
      });

      const totalUsersLastMonth = await this.prisma.users.count({
        where: {
          ...userFilter,
          createdAt: { lt: startOfThisMonth },
        },
      });

      // New Users
      const newUsersThisMonth = await this.prisma.users.count({
        where: {
          ...userFilter,
          createdAt: { gte: startOfThisMonth },
        },
      });

      const newUsersLastMonth = await this.prisma.users.count({
        where: {
          ...userFilter,
          createdAt: {
            gte: startOfLastMonth,
            lt: startOfThisMonth,
          },
        },
      });

      const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Number((((current - previous) / previous) * 100).toFixed(2));
      };

      const activeThisMonthRes = await lastValueFrom(
        this.bookingClient.send<{ message: string; data: { count: number } }>(
          { cmd: 'booking_count_active_users' },
          {
            dateFrom: startOfThisMonth.toISOString(),
            dateTo: now.toISOString(),
          },
        ),
      );

      const activeLastMonthRes = await lastValueFrom(
        this.bookingClient.send<{ message: string; data: { count: number } }>(
          { cmd: 'booking_count_active_users' },
          {
            dateFrom: startOfLastMonth.toISOString(),
            dateTo: new Date(startOfThisMonth.getTime() - 1).toISOString(),
          },
        ),
      );

      const activeUsersThisMonth = activeThisMonthRes?.data?.count ?? 0;
      const activeUsersLastMonth = activeLastMonthRes?.data?.count ?? 0;

      const resultData = {
        total: {
          value: totalUsers,
          growth: calculateGrowth(totalUsers, totalUsersLastMonth),
        },
        newThisMonth: {
          value: newUsersThisMonth,
          growth: calculateGrowth(newUsersThisMonth, newUsersLastMonth),
        },
        active: {
          value: activeUsersThisMonth,
          growth: calculateGrowth(activeUsersThisMonth, activeUsersLastMonth),
        },
      };

      await this.cacheManager.set(cacheKey, resultData, 600);

      return {
        message: 'Fetched user stats successfully',
        data: resultData,
      };
    } catch (err) {
      console.error('Error in UserService.findAll:', err);
      throw new InternalServerErrorException('Failed to fetch user stats', {
        cause: err,
      });
    }
  }

  async getNotificationPreferences(userId: string) {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        select: { notificationPreferences: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const preferences = user.notificationPreferences || {
        email: {
          booking: true,
          payment: true,
          reminder: true,
          promotion: true,
        },
        sms: {
          booking: true,
          payment: false,
          reminder: true,
          promotion: false,
        },
      };

      return {
        message: 'Notification preferences retrieved successfully',
        data: preferences,
      };
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException(
        'Failed to get notification preferences',
        { cause: err },
      );
    }
  }

  async updateNotificationPreferences(userId: string, preferences: any) {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const updated = await this.prisma.users.update({
        where: { id: userId },
        data: {
          notificationPreferences: preferences as Prisma.InputJsonValue,
        },
        select: {
          id: true,
          email: true,
          notificationPreferences: true,
        },
      });

      return {
        message: 'Notification preferences updated successfully',
        data: updated.notificationPreferences,
      };
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException(
        'Failed to update notification preferences',
        { cause: err },
      );
    }
  }

  async getContactForNotifications(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        notificationPreferences: true,
        status: true,
        role: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return { message: 'Fetched user contact successfully', data: user };
  }
}
