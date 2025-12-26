import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientProxy } from '@nestjs/microservices';
import { RedisCacheService } from '@app/shared';
import { CreateBusDto, UpdateBusDto, QueryBusesDto } from '@app/shared/dto';
import { Prisma, BusType, Buses, Seats } from '@prisma/client-trip';

@Injectable()
export class BusesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheManager: RedisCacheService,
    @Inject('SUPPORT_SERVICE') private readonly supportClient: ClientProxy,
  ) {}

  private generateSeats(busId: string, type: BusType) {
    const seats: Array<{
      busId: string;
      seatNumber: string;
    }> = [];

    let cols: string[] = [];
    let rows = 0;

    switch (type) {
      case BusType.standard:
        cols = ['A', 'B', 'C', 'D'];
        rows = 8;
        break;

      case BusType.limousine:
        cols = ['A', 'B', 'C', 'D'];
        rows = 4;
        break;

      case BusType.sleeper:
        cols = ['A', 'B', 'C', 'D'];
        rows = 4;
        break;

      case BusType.vip:
        cols = ['A', 'B', 'C'];
        rows = 6;
        break;

      default:
        cols = ['A', 'B', 'C', 'D'];
        rows = 8;
        break;
    }

    cols.forEach((col) => {
      for (let r = 1; r <= rows; r++) {
        seats.push({
          busId,
          seatNumber: `${col}${r}`,
        });
      }
    });

    return seats;
  }

  async create(
    createBusDto: CreateBusDto,
    userId: string,
    ip: string,
    userAgent: string,
  ) {
    try {
      const exists = await this.prisma.buses.findUnique({
        where: { plate: createBusDto.plate },
      });
      if (exists) {
        throw new BadRequestException('Plate already exists');
      }

      const bus = await this.prisma.buses.create({
        data: {
          plate: createBusDto.plate,
          busType: createBusDto.busType || BusType.standard,
          amenities: createBusDto.amenities || Prisma.JsonNull,
        },
      });

      const seats = this.generateSeats(bus.id, bus.busType);

      await this.prisma.seats.createMany({
        data: seats,
      });

      this.supportClient.emit('log_activity', {
        userId: userId,
        action: 'CREATE_BUS',
        entityId: bus.id,
        entityType: 'Buses',
        metadata: { busId: bus.id, plate: bus.plate },
        ipAddress: ip,
        userAgent: userAgent,
      });

      await this.cacheManager.delByPattern('buses:all*');

      return { message: 'Bus created successfully', data: bus };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Failed to create bus', {
        cause: err,
      });
    }
  }

  async findAll(query?: QueryBusesDto) {
    try {
      const cacheKey = `buses:all:${JSON.stringify(query || {})}`;

      const cachedData = await this.cacheManager.get<Buses[]>(cacheKey);
      if (cachedData) {
        return { message: 'Fetched all buses successfully', data: cachedData };
      }
      const where: Prisma.BusesWhereInput = {};

      if (query?.busType && query.busType.length > 0) {
        where.busType = {
          in: query.busType,
        };
      }

      if (query?.amenities && query.amenities.length > 0) {
        const amenityConditions = query.amenities.map((amenity) => ({
          amenities: {
            path: [amenity],
            equals: true,
          },
        }));
        where.AND = amenityConditions;
      }

      const buses = await this.prisma.buses.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      await this.cacheManager.set(cacheKey, buses, 600);

      return { message: 'Fetched all buses successfully', data: buses };
    } catch (err) {
      throw new InternalServerErrorException('Failed to fetch buses', {
        cause: err,
      });
    }
  }

  async findOne(id: string) {
    try {
      const cacheKey = `buses:detail:${id}`;
      const cachedData = await this.cacheManager.get<Buses>(cacheKey);

      if (cachedData)
        return { message: 'Fetched bus successfully', data: cachedData };

      const bus = await this.prisma.buses.findUnique({
        where: { id },
      });
      if (!bus) throw new NotFoundException('Bus not found');

      await this.cacheManager.set(cacheKey, bus, 86400);

      return { message: 'Fetched bus successfully', data: bus };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to fetch bus', {
        cause: err,
      });
    }
  }

  async update(
    id: string,
    data: UpdateBusDto,
    userId: string,
    ip: string,
    userAgent: string,
  ) {
    try {
      const bus = await this.prisma.buses.findUnique({ where: { id } });
      if (!bus) throw new NotFoundException('Bus not found');

      const updatedBus = await this.prisma.buses.update({
        where: { id },
        data: {
          ...data,
          amenities: data.amenities ?? undefined,
        },
      });

      this.supportClient.emit('log_activity', {
        userId: userId,
        action: 'UPDATE_BUS',
        entityId: bus.id,
        entityType: 'Buses',
        metadata: { busId: bus.id, changes: data },
        ipAddress: ip,
        userAgent: userAgent,
      });

      await this.cacheManager.del(`buses:detail:${id}`);
      await this.cacheManager.delByPattern('buses:all*');

      return { message: 'Bus updated successfully', data: updatedBus };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to update bus', {
        cause: err,
      });
    }
  }

  async remove(id: string, userId: string, ip: string, userAgent: string) {
    try {
      const bus = await this.prisma.buses.findUnique({ where: { id } });
      if (!bus) throw new NotFoundException('Bus not found');

      const [, deletedBus] = await this.prisma.$transaction([
        this.prisma.seats.deleteMany({ where: { busId: id } }),
        this.prisma.buses.delete({ where: { id } }),
      ]);

      this.supportClient.emit('log_activity', {
        userId: userId,
        action: 'DELETE_BUS',
        entityId: bus.id,
        entityType: 'Buses',
        metadata: { busId: bus.id, plate: bus.plate },
        ipAddress: ip,
        userAgent: userAgent,
      });

      await Promise.all([
        this.cacheManager.del(`buses:detail:${id}`),
        this.cacheManager.del(`buses:seats:${id}`),
        this.cacheManager.delByPattern('buses:all*'),
      ]);

      return { message: 'Bus deleted successfully', data: deletedBus };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to delete bus', {
        cause: err,
      });
    }
  }

  async getSeats(busId: string) {
    try {
      const cacheKey = `buses:seats:${busId}`;
      const cachedSeats = await this.cacheManager.get<Seats[]>(cacheKey);

      if (cachedSeats)
        return {
          message: 'Fetched seats for bus successfully',
          data: cachedSeats,
        };

      const bus = await this.prisma.buses.findUnique({ where: { id: busId } });
      if (!bus) throw new NotFoundException('Bus not found');

      const seats = await this.prisma.seats.findMany({
        where: { busId },
        orderBy: { seatNumber: 'asc' },
      });

      await this.cacheManager.set(cacheKey, seats, 604800);

      return { message: 'Fetched seats for bus successfully', data: seats };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to fetch seats', {
        cause: err,
      });
    }
  }
}
