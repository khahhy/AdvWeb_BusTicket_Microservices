import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityLogDto } from '@app/shared';

@Injectable()
export class ActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(data: CreateActivityLogDto) {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entityId: data.entityId,
          entityType: data.entityType,
          // metadata: (data.metadata as Prisma.InputJsonValue) || {},
          metadata: (data.metadata as any) || {},
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (err) {
      console.error('Failed to write activity log:', err);
    }
  }

  async findAll(page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const [logs, total] = await this.prisma.$transaction([
        this.prisma.activityLog.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.activityLog.count(),
      ]);

      return {
        message: 'Fetched activity logs successfully',
        data: {
          logs,
          meta: {
            total,
            page,
            lastPage: Math.ceil(total / limit),
          },
        },
      };
    } catch (err) {
      throw new InternalServerErrorException('Failed to fetch activity logs', {
        cause: err,
      });
    }
  }

  async findByEntity(entityId: string, entityType: string) {
    try {
      const logs = await this.prisma.activityLog.findMany({
        where: {
          entityId,
          entityType,
        },
        orderBy: { createdAt: 'desc' },
      });

      return { message: 'Fetched entity history successfully', data: logs };
    } catch (err) {
      throw new InternalServerErrorException('Failed to fetch entity history', {
        cause: err,
      });
    }
  }

  async findByUser(userId: string) {
    try {
      const logs = await this.prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      return { message: 'Fetched user history successfully', data: logs };
    } catch (err) {
      throw new InternalServerErrorException('Failed to fetch user history', {
        cause: err,
      });
    }
  }
}
