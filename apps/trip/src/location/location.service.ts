import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, Locations } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityLogsService } from 'src/activity-logs/activity-logs.service';
import { RedisCacheService } from 'src/cache/redis-cache.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { QueryLocationDto } from './dto/query-location.dto';
import { normalizeCity } from 'src/common/utils/normalizeCity';

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogsService,
    private readonly cacheManager: RedisCacheService,
  ) {}

  private async clearLocationCache(id?: string) {
    await this.cacheManager.del('locations:cities');
    await this.cacheManager.delByPattern('locations:all*');
    if (id) await this.cacheManager.del(`locations:detail:${id}`);
  }

  async findAll(query: QueryLocationDto) {
    try {
      const cacheKey = `locations:all:${JSON.stringify(query)}`;

      const cachedData = await this.cacheManager.get<Locations[]>(cacheKey);
      if (cachedData) {
        return {
          message: 'Fetched locations successfully',
          data: cachedData,
          count: cachedData.length,
        };
      }

      const { city, search } = query;
      let cityCondition = {};
      if (city) {
        const normalizedInput = normalizeCity(city);

        const existingCities = await this.prisma.locations.findMany({
          distinct: ['city'],
          select: { city: true },
        });

        const matchedCity = existingCities.find(
          (item) => normalizeCity(item.city) === normalizedInput,
        );

        if (matchedCity) {
          cityCondition = { city: matchedCity.city };
        } else {
          cityCondition = {
            city: { contains: city.trim(), mode: 'insensitive' },
          };
        }
      }

      const where: Prisma.LocationsWhereInput = {
        AND: [
          cityCondition,
          search
            ? {
                name: {
                  contains: search.trim(),
                  mode: 'insensitive',
                },
              }
            : {},
        ],
      };

      const locations = await this.prisma.locations.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      await this.cacheManager.set(cacheKey, locations, 3600);

      return {
        message: 'Fetched locations successfully',
        data: locations,
        count: locations.length,
      };
    } catch (err) {
      throw new InternalServerErrorException('Failed to fetch locations', {
        cause: err,
      });
    }
  }

  async findOne(id: string) {
    try {
      const cacheKey = `locations:detail:${id}`;
      const cachedData = await this.cacheManager.get<Locations>(cacheKey);
      if (cachedData)
        return { message: 'Fetched location successfully', data: cachedData };

      const location = await this.prisma.locations.findUnique({
        where: { id },
      });
      if (!location) throw new NotFoundException('Location not found');

      await this.cacheManager.set(cacheKey, location, 86400);
      return { message: 'Fetched location successfully', data: location };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to fetch location', {
        cause: err,
      });
    }
  }

  async getCities() {
    try {
      const cacheKey = 'locations:cities';
      const cachedCities = await this.cacheManager.get<string[]>(cacheKey);

      if (cachedCities) {
        return {
          message: 'Fetched list of cities successfully',
          data: cachedCities,
        };
      }

      const cities = await this.prisma.locations.findMany({
        distinct: ['city'],
        select: { city: true },
        orderBy: { city: 'asc' },
      });

      const result = cities.map((c) => c.city);
      await this.cacheManager.set(cacheKey, result, 86400);

      return {
        message: 'Fetched list of cities successfully',
        data: cities.map((c) => c.city),
      };
    } catch (err) {
      throw new InternalServerErrorException('Failed to fetch cities', {
        cause: err,
      });
    }
  }

  async create(
    createLocationDto: CreateLocationDto,
    userId: string,
    ip: string,
    userAgent: string,
  ) {
    try {
      const newLocation = await this.prisma.locations.create({
        data: createLocationDto,
      });

      await this.clearLocationCache();

      await this.activityLogService.logAction({
        userId: userId,
        action: 'CREATE_LOCATION',
        entityId: newLocation.id,
        entityType: 'Locations',
        metadata: { locationId: newLocation.id },
        ipAddress: ip,
        userAgent: userAgent,
      });

      return { message: 'Location created successfully', data: newLocation };
    } catch (err) {
      throw new InternalServerErrorException('Failed to create location', {
        cause: err,
      });
    }
  }

  async update(
    id: string,
    updateLocationDto: UpdateLocationDto,
    userId: string,
    ip: string,
    userAgent: string,
  ) {
    try {
      const location = await this.prisma.locations.findUnique({
        where: { id },
      });
      if (!location) throw new NotFoundException('Location not found');

      const updatedLocation = await this.prisma.locations.update({
        where: { id },
        data: updateLocationDto,
      });

      await this.clearLocationCache(id);

      await this.activityLogService.logAction({
        userId: userId,
        action: 'UPDATE_LOCATION',
        entityId: updatedLocation.id,
        entityType: 'Locations',
        metadata: { locationId: updatedLocation.id },
        ipAddress: ip,
        userAgent: userAgent,
      });

      return {
        message: 'Location updated successfully',
        data: updatedLocation,
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to update location', {
        cause: err,
      });
    }
  }

  async remove(id: string, userId: string, ip: string, userAgent: string) {
    try {
      const location = await this.prisma.locations.findUnique({
        where: { id },
      });
      if (!location) throw new NotFoundException('Location not found');

      const deletedLocation = await this.prisma.locations.delete({
        where: { id },
      });

      await this.clearLocationCache(id);
      await this.activityLogService.logAction({
        userId: userId,
        action: 'DELETE_LOCATION',
        entityId: deletedLocation.id,
        entityType: 'Locations',
        metadata: { locationId: deletedLocation.id },
        ipAddress: ip,
        userAgent: userAgent,
      });

      return {
        message: 'Location deleted successfully',
        data: deletedLocation,
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to delete location', {
        cause: err,
      });
    }
  }
}
