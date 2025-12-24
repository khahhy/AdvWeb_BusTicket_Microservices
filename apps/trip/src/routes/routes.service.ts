import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { ActivityLogsService } from 'src/activity-logs/activity-logs.service';
import { RedisCacheService } from 'src/cache/redis-cache.service';
import { SettingService } from 'src/setting/setting.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { GetRouteTripsDto } from './dto/get-route-trips';
import { CreateTripRouteMapDto } from './dto/create-trip-route-map.dto';
import {
  QueryTripRouteMapDto,
  SortOrder,
} from './dto/query-trip-route-map.dto';
import { BusTypePricingDto } from 'src/setting/dto/bus-type-pricing.dto';
import { PricingPoliciesDto } from 'src/setting/dto/pricing-policies.dto';
import {
  Prisma,
  TripStatus,
  Trips,
  TripStops,
  Locations,
  BookingStatus,
  Routes,
  Buses,
  SettingKey,
  BusType,
} from '@prisma/client';
import { TripsForRouteResponse } from 'src/common/type/trip-available-for-route.interface';
import { TopPerformingRoute } from 'src/common/type/top-performing-route.interface';

@Injectable()
export class RoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogsService,
    private readonly cacheManager: RedisCacheService,
    private readonly settingService: SettingService,
  ) {}

  private async clearRouteCache(id?: string) {
    await this.cacheManager.delByPattern('routes:all*');
    if (id) {
      await this.cacheManager.del(`routes:detail:${id}`);
    }
  }

  private async clearTripMapCache(tripId?: string, routeId?: string) {
    await this.cacheManager.delByPattern('trip-route-map:search*');
    await this.cacheManager.del('routes:top-performing');

    if (routeId) {
      await this.cacheManager.delByPattern(`routes:trips:${routeId}*`);
    }
    if (tripId && routeId) {
      await this.cacheManager.del(`trip-route-map:detail:${tripId}:${routeId}`);
    }
  }

  async create(
    createRouteDto: CreateRouteDto,
    userId: string,
    ip: string,
    userAgent: string,
  ) {
    try {
      const { originLocationId, destinationLocationId } = createRouteDto;

      if (originLocationId === destinationLocationId) {
        throw new BadRequestException(
          'Origin and Destination cannot be the same location',
        );
      }

      const [origin, destination] = await Promise.all([
        this.prisma.locations.findUnique({ where: { id: originLocationId } }),
        this.prisma.locations.findUnique({
          where: { id: destinationLocationId },
        }),
      ]);

      if (!origin || !destination) {
        throw new NotFoundException('Origin or Destination location not found');
      }

      const existingRoute = await this.prisma.routes.findFirst({
        where: {
          originLocationId,
          destinationLocationId,
        },
      });

      if (existingRoute) {
        throw new BadRequestException('This route already exists');
      }

      const routeName = `${origin.city} - ${destination.city}`;

      const route = await this.prisma.routes.create({
        data: {
          originLocationId,
          destinationLocationId,
          name: routeName,
          description: createRouteDto.description,
          isActive: false,
        },
        include: {
          origin: true,
          destination: true,
        },
      });

      await this.clearRouteCache();

      await this.activityLogService.logAction({
        userId: userId,
        action: 'CREATE_ROUTE',
        entityId: route.id,
        entityType: 'Routes',
        metadata: { routeId: route.id },
        ipAddress: ip,
        userAgent: userAgent,
      });

      return { message: 'Route created successfully', data: route };
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to create route', {
        cause: err,
      });
    }
  }

  async findAll(originId?: string, destinationId?: string, isActive?: boolean) {
    try {
      const cacheKey = `routes:all:${JSON.stringify({ originId, destinationId, isActive })}`;

      const cachedData = await this.cacheManager.get<Routes[]>(cacheKey);
      if (cachedData) {
        return { message: 'Fetched routes successfully', data: cachedData };
      }

      const where: Prisma.RoutesWhereInput = {};
      if (originId) where.originLocationId = originId;
      if (destinationId) where.destinationLocationId = destinationId;
      if (isActive !== undefined) where.isActive = isActive;

      const routes = await this.prisma.routes.findMany({
        where,
        include: {
          origin: true,
          destination: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      await this.cacheManager.set(cacheKey, routes, 86400);

      return { message: 'Fetched routes successfully', data: routes };
    } catch (err) {
      throw new InternalServerErrorException('Failed to fetch routes', {
        cause: err,
      });
    }
  }

  async findOne(id: string) {
    try {
      const cacheKey = `routes:detail:${id}`;
      const cachedData = await this.cacheManager.get<Routes>(cacheKey);

      if (cachedData)
        return { message: 'Fetched route successfully', data: cachedData };

      const route = await this.prisma.routes.findUnique({
        where: { id },
        include: {
          origin: true,
          destination: true,
          tripRoutes: {
            include: {
              trip: true,
            },
          },
        },
      });

      if (!route) throw new NotFoundException('Route not found');

      await this.cacheManager.set(cacheKey, route, 86400);

      return { message: 'Fetched route successfully', data: route };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to fetch route', {
        cause: err,
      });
    }
  }

  async update(
    id: string,
    updateRouteDto: UpdateRouteDto,
    userId: string,
    ip: string,
    userAgent: string,
  ) {
    try {
      const existingRoute = await this.prisma.routes.findUnique({
        where: { id },
        include: { origin: true, destination: true },
      });

      if (!existingRoute) throw new NotFoundException('Route not found');

      let newName = existingRoute.name;

      if (
        (updateRouteDto.originLocationId &&
          updateRouteDto.originLocationId !== existingRoute.originLocationId) ||
        (updateRouteDto.destinationLocationId &&
          updateRouteDto.destinationLocationId !==
            existingRoute.destinationLocationId)
      ) {
        const newOriginId =
          updateRouteDto.originLocationId || existingRoute.originLocationId;
        const newDestId =
          updateRouteDto.destinationLocationId ||
          existingRoute.destinationLocationId;

        if (newOriginId === newDestId) {
          throw new BadRequestException(
            'Origin and Destination cannot be the same location',
          );
        }

        const [origin, destination] = await Promise.all([
          this.prisma.locations.findUnique({ where: { id: newOriginId } }),
          this.prisma.locations.findUnique({ where: { id: newDestId } }),
        ]);

        if (!origin || !destination) {
          throw new NotFoundException(
            'New Origin or Destination location not found',
          );
        }
        newName = `${origin.city} - ${destination.city}`;
      }

      const updatedRoute = await this.prisma.routes.update({
        where: { id },
        data: {
          ...updateRouteDto,
          name: newName,
        },
        include: {
          origin: true,
          destination: true,
        },
      });

      await this.clearRouteCache(id);
      await this.activityLogService.logAction({
        userId: userId,
        action: 'UPDATE_ROUTE',
        entityId: updatedRoute.id,
        entityType: 'Routes',
        metadata: { routeId: updatedRoute.id },
        ipAddress: ip,
        userAgent: userAgent,
      });

      return { message: 'Route updated successfully', data: updatedRoute };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to update route', {
        cause: err,
      });
    }
  }

  async remove(id: string, userId: string, ip: string, userAgent: string) {
    try {
      const route = await this.prisma.routes.findUnique({ where: { id } });
      if (!route) throw new NotFoundException('Route not found');

      const bookingCount = await this.prisma.bookings.count({
        where: { routeId: id },
      });

      if (bookingCount > 0) {
        throw new BadRequestException(
          `Cannot delete this Route. There are ${bookingCount} bookings associated with it.`,
        );
      }

      await this.prisma.$transaction([
        this.prisma.tripRouteMap.deleteMany({
          where: { routeId: id },
        }),
        this.prisma.routes.delete({
          where: { id },
        }),
      ]);

      await this.clearRouteCache(id);
      await this.activityLogService.logAction({
        userId: userId,
        action: 'DELETE_ROUTE',
        entityId: id,
        entityType: 'Routes',
        metadata: { routeId: id },
        ipAddress: ip,
        userAgent: userAgent,
      });

      return {
        message: 'Route and associated trip-maps deleted successfully',
      };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to delete route', {
        cause: err,
      });
    }
  }

  // trip contain location of route, not sure it's activate
  async findTripsForRoute(routeId: string, query: GetRouteTripsDto) {
    try {
      const cacheKey = `routes:trips:${routeId}:${JSON.stringify(query)}`;
      const cachedData =
        await this.cacheManager.get<TripsForRouteResponse[]>(cacheKey);

      if (cachedData) {
        return {
          message: `Found ${cachedData.length} trips matching this route`,
          data: cachedData,
        };
      }
      const [route, policySetting, busPriceSetting] = await Promise.all([
        this.prisma.routes.findUnique({ where: { id: routeId } }),
        this.settingService.findOne(SettingKey.PRICING_POLICIES),
        this.settingService.findOne(SettingKey.BUS_TYPE_PRICING),
      ]);
      if (!route) throw new NotFoundException('Route not found');

      const policies = (policySetting.data as PricingPoliciesDto) || {
        pricePerKm: 1500,
        weekendSurcharge: 0,
        holidaySurcharge: 0,
      };
      const busMultipliers = (busPriceSetting.data as BusTypePricingDto) || {
        standard: 1.0,
        vip: 1.2,
        sleeper: 1.3,
        limousine: 1.5,
      };

      const { startDate, endDate } = query;
      const whereTrip: Prisma.TripsWhereInput = {
        status: TripStatus.scheduled,
      };

      if (startDate || endDate) {
        whereTrip.startTime = {};
        if (startDate) whereTrip.startTime.gte = new Date(startDate);
        if (endDate) whereTrip.startTime.lte = new Date(endDate);
      }

      const trips = await this.prisma.trips.findMany({
        where: {
          ...whereTrip,
          AND: [
            { tripStops: { some: { locationId: route.originLocationId } } },
            {
              tripStops: { some: { locationId: route.destinationLocationId } },
            },
          ],
        },
        include: {
          tripStops: {
            include: { location: true },
            orderBy: { sequence: 'asc' },
          },
          bus: true,
        },
      });

      const resolvedTrips = trips
        .map((trip) => {
          const pricing = this.calculateTripRoutePrice(
            trip,
            route.originLocationId,
            route.destinationLocationId,
            policies,
            busMultipliers,
          );

          if (!pricing) return null;

          return {
            tripId: trip.id,
            startTime: trip.startTime,
            endTime: trip.endTime,
            busName: trip.bus.plate,
            busType: trip.bus.busType,
            amenities: trip.bus.amenities,
            pickupLocation: pricing.pickupName,
            dropoffLocation: pricing.dropoffName,
            pricing: pricing.details,
          };
        })
        .filter((item) => item !== null);

      await this.cacheManager.set(cacheKey, resolvedTrips, 300);
      return {
        message: `Found ${resolvedTrips.length} trips matching this route`,
        data: resolvedTrips,
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to find trips for route', {
        cause: err,
      });
    }
  }

  async createTripRouteMap(
    dto: CreateTripRouteMapDto,
    userId: string,
    ip: string,
    userAgent: string,
  ) {
    try {
      const { tripId, routeId, manualPrice } = dto;

      const existingMap = await this.prisma.tripRouteMap.findUnique({
        where: { tripId_routeId: { tripId, routeId } },
      });

      if (existingMap) {
        throw new ConflictException(
          'This configuration for Trip and Route already exists.',
        );
      }

      const [route, trip, policySetting, busPriceSetting] = await Promise.all([
        this.prisma.routes.findUnique({ where: { id: routeId } }),
        this.prisma.trips.findUnique({
          where: { id: tripId },
          include: {
            tripStops: {
              include: { location: true },
              orderBy: { sequence: 'asc' },
            },
            bus: true,
          },
        }),
        this.settingService.findOne(SettingKey.PRICING_POLICIES),
        this.settingService.findOne(SettingKey.BUS_TYPE_PRICING),
      ]);
      if (!route) throw new NotFoundException('Route not found');
      if (!trip) throw new NotFoundException('Trip not found');

      let finalPrice = 0;

      if (manualPrice !== undefined && manualPrice !== null) {
        finalPrice = manualPrice;
      } else {
        // Prepare settings
        const policies = (policySetting.data as PricingPoliciesDto) || {
          pricePerKm: 1500,
          weekendSurcharge: 0,
          holidaySurcharge: 0,
        };
        const busMultipliers = (busPriceSetting.data as BusTypePricingDto) || {
          standard: 1.0,
          vip: 1.2,
          sleeper: 1.3,
          limousine: 1.5,
        };

        const pricingCalc = this.calculateTripRoutePrice(
          trip,
          route.originLocationId,
          route.destinationLocationId,
          policies,
          busMultipliers,
        );

        if (!pricingCalc) {
          throw new BadRequestException(
            'Invalid Trip for this Route (Stops do not match or wrong sequence)',
          );
        }
        finalPrice = pricingCalc.details.finalPrice;
      }

      const operations: Prisma.PrismaPromise<unknown>[] = [
        this.prisma.tripRouteMap.create({
          data: {
            tripId,
            routeId,
            price: finalPrice,
          },
        }),
      ];

      if (!route.isActive) {
        operations.push(
          this.prisma.routes.update({
            where: { id: routeId },
            data: { isActive: true },
          }),
        );
      }

      const [newTripRouteMap] = await this.prisma.$transaction(operations);

      await this.clearTripMapCache(tripId, routeId);
      await this.activityLogService.logAction({
        userId: userId,
        action: 'CREATE_TRIP_ROUTE_MAP',
        entityType: 'Routes',
        metadata: { routeId: routeId, tripId: tripId },
        ipAddress: ip,
        userAgent: userAgent,
      });

      return {
        message: 'Trip Route Map created successfully',
        data: newTripRouteMap,
      };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof ConflictException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(
        'Failed to create trip route map',
        { cause: err },
      );
    }
  }

  async removeTripRouteMap(
    tripId: string,
    routeId: string,
    userId: string,
    ip: string,
    userAgent: string,
  ) {
    try {
      const tripRouteMap = await this.prisma.tripRouteMap.findUnique({
        where: {
          tripId_routeId: { tripId, routeId },
        },
      });

      if (!tripRouteMap) {
        throw new NotFoundException('TripRouteMap configuration not found');
      }

      const bookingCount = await this.prisma.bookings.count({
        where: {
          tripId: tripId,
          routeId: routeId,
        },
      });

      if (bookingCount > 0) {
        throw new BadRequestException(
          `Cannot delete this Trip configuration. There are ${bookingCount} bookings associated with it.`,
        );
      }

      await this.prisma.tripRouteMap.delete({
        where: {
          tripId_routeId: { tripId, routeId },
        },
      });

      await this.clearTripMapCache(tripId, routeId);
      await this.activityLogService.logAction({
        userId: userId,
        action: 'DELETE_TRIP_ROUTE_MAP',
        entityType: 'Routes',
        metadata: { routeId: routeId, tripId: tripId },
        ipAddress: ip,
        userAgent: userAgent,
      });

      return { message: 'TripRouteMap deleted successfully' };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(
        'Failed to delete trip route map',
        { cause: err },
      );
    }
  }

  async getTripRouteMap(tripId: string, routeId: string) {
    try {
      const cacheKey = `trip-route-map:detail:${tripId}:${routeId}`;
      const cachedData =
        await this.cacheManager.get<TripsForRouteResponse>(cacheKey);
      if (cachedData)
        return {
          message: 'Fetched trip detail successfully',
          data: cachedData,
        };

      const data = await this.prisma.tripRouteMap.findUnique({
        where: {
          tripId_routeId: { tripId, routeId },
        },
        include: {
          trip: {
            include: {
              bus: true,
            },
          },
          route: {
            include: {
              origin: true,
              destination: true,
            },
          },
        },
      });

      if (!data) {
        throw new NotFoundException('TripRouteMap configuration not found');
      }

      const response = {
        message: 'Fetched trip detail successfully',
        data: {
          tripId: data.tripId,
          routeId: data.routeId,
          price: data.price,
          tripName: data.trip.tripName,
          startTime: data.trip.startTime,
          endTime: data.trip.endTime,
          status: data.trip.status,
          bus: {
            id: data.trip.bus.id,
            busType: data.trip.bus.busType,
            plate: data.trip.bus.plate,
            amenities: data.trip.bus.amenities,
          },
          routeName: data.route.name,
          origin: data.route.origin.name,
          originCity: data.route.origin.city,
          destination: data.route.destination.name,
          destinationCity: data.route.destination.city,
        },
      };

      await this.cacheManager.set(cacheKey, response, 1800);

      return response;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(
        'Failed to get trip route map detail',
        { cause: err },
      );
    }
  }

  // Get All Trip Maps with Pagination & Filter
  async findAllTripRouteMaps(query: QueryTripRouteMapDto) {
    try {
      const cacheKey = `trip-route-map:search:${JSON.stringify(query)}`;

      const cachedData =
        await this.cacheManager.get<TripsForRouteResponse>(cacheKey);
      if (cachedData) {
        return {
          message: 'Fetched trip route maps successfully (from cache)',
          data: cachedData,
        };
      }

      const {
        page = 1,
        limit = 20,
        routeId,
        tripId,
        routeName,
        locationId,
        originLocationId,
        destinationLocationId,
        minPrice,
        maxPrice,
        sortByPrice,
        departureDate,
        departureTimeStart,
        departureTimeEnd,
        busType,
        amenities,
        minDuration,
        maxDuration,
        sortByDuration,
      } = query;

      const skip = (page - 1) * limit;

      const where: Prisma.TripRouteMapWhereInput = {};

      if (routeId) where.routeId = routeId;
      if (tripId) where.tripId = tripId;

      if (locationId) {
        where.route = {
          OR: [
            { originLocationId: locationId },
            { destinationLocationId: locationId },
          ],
        };
      }

      if (routeName) {
        where.route = where.route || {};

        where.route.name = {
          contains: routeName,
          mode: 'insensitive',
        };
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) where.price.gte = minPrice;
        if (maxPrice !== undefined) where.price.lte = maxPrice;
      }

      // Advanced filtering conditions
      const tripConditions: Prisma.TripsWhereInput = {};

      // Specific origin and destination filtering based on trip stops
      if (originLocationId || destinationLocationId) {
        const locationFilters: Prisma.TripsWhereInput = {};

        // If both origin and destination are specified, find trips with both locations in correct order
        if (originLocationId && destinationLocationId) {
          locationFilters.AND = [
            {
              tripStops: {
                some: {
                  locationId: originLocationId,
                },
              },
            },
            {
              tripStops: {
                some: {
                  locationId: destinationLocationId,
                },
              },
            },
          ];
        } else if (originLocationId) {
          // Only origin specified
          locationFilters.tripStops = {
            some: {
              locationId: originLocationId,
            },
          };
        } else if (destinationLocationId) {
          // Only destination specified
          locationFilters.tripStops = {
            some: {
              locationId: destinationLocationId,
            },
          };
        }

        // Merge with existing trip conditions
        where.trip = {
          ...tripConditions,
          ...locationFilters,
        };
      }

      // Filter by departure date
      if (departureDate) {
        const startOfDay = new Date(departureDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(departureDate);
        endOfDay.setHours(23, 59, 59, 999);

        tripConditions.startTime = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }

      // Filter by departure time range
      if (departureTimeStart || departureTimeEnd) {
        if (!tripConditions.startTime) {
          tripConditions.startTime = {};
        }

        if (departureTimeStart) {
          const [hours, minutes] = departureTimeStart.split(':').map(Number);
          if (departureDate) {
            const startTime = new Date(departureDate);
            startTime.setHours(hours, minutes, 0, 0);
            const currentGte = (
              tripConditions.startTime as Prisma.DateTimeFilter
            ).gte;
            tripConditions.startTime = {
              ...(tripConditions.startTime as Prisma.DateTimeFilter),
              gte:
                currentGte && currentGte > startTime ? currentGte : startTime,
            };
          }
        }

        if (departureTimeEnd) {
          const [hours, minutes] = departureTimeEnd.split(':').map(Number);
          if (departureDate) {
            const endTime = new Date(departureDate);
            endTime.setHours(hours, minutes, 59, 999);
            const currentLte = (
              tripConditions.startTime as Prisma.DateTimeFilter
            ).lte;
            tripConditions.startTime = {
              ...(tripConditions.startTime as Prisma.DateTimeFilter),
              lte: currentLte && currentLte < endTime ? currentLte : endTime,
            };
          }
        }
      }

      const busWhere: Prisma.BusesWhereInput = {};

      // Filter by bus type
      if (busType && busType.length > 0) {
        busWhere.busType = { in: busType };
      }

      // Filter by Amenities - Enhanced to handle both object and array formats
      if (amenities && amenities.length > 0) {
        busWhere.OR = [
          // Handle object format: { wifi: true, airCondition: true, ... }
          {
            AND: amenities.map((amenity) => ({
              amenities: {
                path: [amenity],
                equals: true,
              },
            })),
          },
          // Handle array format: ["wifi", "airCondition", ...]
          {
            amenities: {
              array_contains: amenities,
            },
          },
        ];
      }

      if (Object.keys(busWhere).length > 0) {
        tripConditions.bus = busWhere;
      }

      // Only set trip conditions if origin/destination filtering wasn't already applied
      if (Object.keys(tripConditions).length > 0 && !where.trip) {
        where.trip = tripConditions;
      }

      const orderBy: Prisma.TripRouteMapOrderByWithRelationInput = {};
      if (sortByPrice) {
        orderBy.price = sortByPrice;
      } else {
        orderBy.trip = { startTime: 'desc' };
      }

      // If filtering by origin/destination sequence or duration, we need to fetch more data
      // to apply filters at application level, then paginate
      const needsAppLevelFiltering =
        (originLocationId && destinationLocationId) ||
        minDuration !== undefined ||
        maxDuration !== undefined ||
        sortByDuration;

      const [rawTripData, total] = await this.prisma.$transaction([
        this.prisma.tripRouteMap.findMany({
          skip: needsAppLevelFiltering ? undefined : skip,
          take: needsAppLevelFiltering ? undefined : limit,
          where,
          orderBy,
          select: {
            price: true,
            tripId: true,
            routeId: true,
            route: {
              select: {
                name: true,
                origin: { select: { city: true, name: true } },
                destination: { select: { city: true, name: true } },
              },
            },
            trip: {
              select: {
                id: true,
                startTime: true,
                endTime: true,
                status: true,
                tripStops: {
                  select: {
                    id: true,
                    locationId: true,
                    sequence: true,
                    arrivalTime: true,
                    departureTime: true,
                    location: true,
                  },
                  orderBy: {
                    sequence: 'asc',
                  },
                },
                bus: {
                  select: {
                    id: true,
                    plate: true,
                    busType: true,
                    amenities: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.tripRouteMap.count({ where }),
      ]);

      type RawItem = (typeof rawTripData)[number];
      type ProcessedItem = RawItem & { durationMinutes?: number };

      // Process data - add duration if needed
      let processedData: ProcessedItem[] = rawTripData.map((item) => {
        if (minDuration || maxDuration || sortByDuration) {
          const start = new Date(item.trip.startTime).getTime();
          const end = new Date(item.trip.endTime).getTime();
          const durationMinutes = (end - start) / 60000;
          return { ...item, durationMinutes };
        }
        return item;
      });

      // Filter trips based on origin/destination sequence order
      if (originLocationId && destinationLocationId) {
        processedData = processedData.filter((item) => {
          const tripStops = item.trip.tripStops;
          const originStop = tripStops.find(
            (stop) => stop.locationId === originLocationId,
          );
          const destinationStop = tripStops.find(
            (stop) => stop.locationId === destinationLocationId,
          );

          // Both stops must exist and origin must come before destination
          return (
            originStop &&
            destinationStop &&
            originStop.sequence < destinationStop.sequence
          );
        });
      }

      // Filter by duration if needed
      if (minDuration !== undefined) {
        processedData = processedData.filter(
          (item) => (item.durationMinutes ?? 0) >= minDuration,
        );
      }
      if (maxDuration !== undefined) {
        processedData = processedData.filter(
          (item) => (item.durationMinutes ?? 0) <= maxDuration,
        );
      }

      // Sort by duration if needed
      if (sortByDuration) {
        processedData.sort((a, b) => {
          const durationA = a.durationMinutes ?? 0;
          const durationB = b.durationMinutes ?? 0;
          return sortByDuration === SortOrder.ASC
            ? durationA - durationB
            : durationB - durationA;
        });
      }

      // Apply pagination at application level if we did app-level filtering
      let finalItems = processedData;
      let finalTotal = total;

      if (needsAppLevelFiltering) {
        finalTotal = processedData.length;
        const startIndex = (page - 1) * limit;
        finalItems = processedData.slice(startIndex, startIndex + limit);
      }

      const resultData = {
        items: finalItems,
        meta: {
          total: finalTotal,
          page,
          limit,
          lastPage: Math.ceil(finalTotal / limit),
        },
      };
      await this.cacheManager.set(cacheKey, resultData, 300);

      return {
        message: 'Fetched trip route maps successfully',
        data: resultData,
      };
    } catch (err) {
      throw new InternalServerErrorException(
        'Failed to fetch trip route maps',
        { cause: err },
      );
    }
  }

  private calculateTripRoutePrice(
    trip: Trips & {
      tripStops: (TripStops & { location: Locations })[];
      bus: Buses;
    },
    originId: string,
    destinationId: string,
    policies: PricingPoliciesDto,
    busMultipliers: BusTypePricingDto,
  ) {
    const originStop = trip.tripStops.find((s) => s.locationId === originId);
    const destStop = trip.tripStops.find((s) => s.locationId === destinationId);

    if (!originStop || !destStop || originStop.sequence >= destStop.sequence) {
      return null;
    }

    const distanceKm = this.calculateSegmentDistance(
      trip.tripStops,
      originStop.sequence,
      destStop.sequence,
    );

    const priceDetails = this.calculatePrice(
      trip.startTime,
      distanceKm,
      trip.bus.busType,
      policies,
      busMultipliers,
    );

    return {
      pickupName: originStop.location.name,
      dropoffName: destStop.location.name,
      details: {
        ...priceDetails,
        currency: 'VND',
      },
    };
  }
  private roundToThousands(amount: number): number {
    return Math.ceil(amount / 1000) * 1000;
  }

  private calculateSegmentDistance(
    sortedStops: (TripStops & { location: Locations })[],
    startSeq: number,
    endSeq: number,
  ): number {
    let totalDistance = 0;
    for (let i = 0; i < sortedStops.length - 1; i++) {
      const currentStop = sortedStops[i];
      const nextStop = sortedStops[i + 1];

      if (currentStop.sequence >= startSeq && nextStop.sequence <= endSeq) {
        if (
          currentStop.location.latitude &&
          currentStop.location.longitude &&
          nextStop.location.latitude &&
          nextStop.location.longitude
        ) {
          totalDistance += this.getDistanceFromLatLonInKm(
            currentStop.location.latitude,
            currentStop.location.longitude,
            nextStop.location.latitude,
            nextStop.location.longitude,
          );
        }
      }
    }
    return totalDistance;
  }

  private getDistanceFromLatLonInKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number) {
    return deg * (Math.PI / 180);
  }

  private calculatePrice(
    date: Date,
    distanceKm: number,
    busType: BusType,
    policies: PricingPoliciesDto,
    busMultipliers: BusTypePricingDto,
  ) {
    const basePricePerKm = policies.pricePerKm;
    const baseRoutePrice = distanceKm * basePricePerKm;

    const busFactor = busMultipliers[busType] || 1.0;

    let surchargePercent = 0;
    let surchargeReason = 'Normal day';

    const tripDate = new Date(date);
    const dayOfWeek = tripDate.getDay();
    const day = tripDate.getDate();
    const month = tripDate.getMonth() + 1;

    const isHoliday =
      (day === 30 && month === 4) ||
      (day === 1 && month === 5) ||
      (day === 2 && month === 9) ||
      (day === 1 && month === 1);

    if (isHoliday) {
      surchargePercent = policies.holidaySurcharge;
      surchargeReason = 'Holiday surcharge';
    } else if (dayOfWeek === 0 || dayOfWeek === 6) {
      surchargePercent = policies.weekendSurcharge;
      surchargeReason = 'Weekend surcharge';
    }

    const priceBeforeSurcharge = baseRoutePrice * busFactor;
    const finalRawPrice = priceBeforeSurcharge * (1 + surchargePercent);

    const roundedPrice = this.roundToThousands(finalRawPrice);

    return {
      basePrice: this.roundToThousands(baseRoutePrice),
      busTypeFactor: busFactor,
      surcharge: `${(surchargePercent * 100).toFixed(0)}%`,
      surchargeReason,
      finalPrice: roundedPrice,
    };
  }

  async getTopPerforming(limit: number = 5) {
    try {
      const cacheKey = `routes:top-performing:${limit}`;
      const cachedData =
        await this.cacheManager.get<TopPerformingRoute[]>(cacheKey);

      if (cachedData) {
        return {
          message: 'Fetched top performing routes successfully (from cache)',
          data: cachedData,
        };
      }

      const topRoutesRaw = await this.prisma.bookings.groupBy({
        by: ['routeId'],
        where: {
          status: BookingStatus.confirmed,
        },
        _count: {
          id: true,
        },
        _sum: {
          price: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: limit,
      });

      let formattedResult: any[] = [];

      if (topRoutesRaw.length > 0) {
        const routeIds = topRoutesRaw.map((item) => item.routeId);

        const routesDetails = await this.prisma.routes.findMany({
          where: {
            id: { in: routeIds },
          },
          select: {
            id: true,
            name: true,
            origin: { select: { city: true, name: true } },
            destination: { select: { city: true, name: true } },
          },
        });

        formattedResult = topRoutesRaw.map((stat) => {
          const routeInfo = routesDetails.find((r) => r.id === stat.routeId);
          return {
            routeId: stat.routeId,
            routeName: routeInfo?.name || 'Unknown Route',
            origin: routeInfo?.origin.city,
            destination: routeInfo?.destination.city,
            totalBookings: stat._count.id,
            totalRevenue: stat._sum.price || 0,
          };
        });
      } else {
        const defaultRoutes = await this.prisma.routes.findMany({
          take: limit,
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          include: {
            origin: { select: { city: true, name: true } },
            destination: { select: { city: true, name: true } },
          },
        });

        formattedResult = defaultRoutes.map((route) => ({
          routeId: route.id,
          routeName: route.name,
          origin: route.origin.city,
          destination: route.destination.city,
          totalBookings: 0,
          totalRevenue: 0,
        }));
      }

      await this.cacheManager.set(cacheKey, formattedResult, 3600);

      return {
        message: 'Fetched top performing routes successfully',
        data: formattedResult,
      };
    } catch (err) {
      throw new InternalServerErrorException(
        'Failed to fetch top performing routes',
        { cause: err },
      );
    }
  }
}
