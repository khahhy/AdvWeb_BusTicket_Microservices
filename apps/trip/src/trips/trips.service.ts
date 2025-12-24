import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityLogsService } from 'src/activity-logs/activity-logs.service';
import { RedisCacheService } from 'src/cache/redis-cache.service';
import { CreateTripDto } from 'src/trips/dto/create-trip.dto';
import { TripQueryDto } from 'src/trips/dto/trip-query.dto';
import { SearchTripDto } from 'src/trips/dto/search-trip.dto';
import { UpdateTripDto } from 'src/trips/dto/update-trip.dto';
import { Prisma, TripStatus, Trips } from '@prisma/client';
import { normalizeCity } from 'src/common/utils/normalizeCity';

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogsService,
    private readonly cacheManager: RedisCacheService,
  ) {}

  private async clearTripCache(tripId?: string) {
    await this.cacheManager.delByPattern('trips:search*');

    if (tripId) {
      await this.cacheManager.delByPattern(`trips:detail:${tripId}*`);
    }
  }

  async create(
    dto: CreateTripDto,
    userId: string,
    ip: string,
    userAgent: string,
  ) {
    const { busId, stops } = dto;

    const bus = await this.prisma.buses.findUnique({ where: { id: busId } });
    if (!bus) {
      throw new BadRequestException('Invalid busId');
    }

    if (!stops || stops.length < 2) {
      throw new BadRequestException('A trip must have at least 2 stops');
    }

    for (let i = 0; i < stops.length; i++) {
      const curr = stops[i];
      const arrival = curr.arrivalTime
        ? new Date(curr.arrivalTime).getTime()
        : null;
      const departure = curr.departureTime
        ? new Date(curr.departureTime).getTime()
        : null;

      if (arrival && departure && arrival > departure) {
        throw new BadRequestException(
          `Stop ${i + 1}: arrivalTime must be <= departureTime`,
        );
      }

      if (i > 0) {
        const prevDeparture = stops[i - 1].departureTime
          ? new Date(stops[i - 1].departureTime).getTime()
          : null;

        if (arrival && prevDeparture && arrival < prevDeparture) {
          throw new BadRequestException(
            `Stop ${i + 1}: arrivalTime overlaps with previous stop`,
          );
        }
      }
    }

    const firstStop = stops[0];
    const lastStop = stops[stops.length - 1];

    const firstLocation = await this.prisma.locations.findUnique({
      where: { id: stops[0].locationId },
    });
    const lastLocation = await this.prisma.locations.findUnique({
      where: { id: stops[stops.length - 1].locationId },
    });

    if (!firstLocation || !lastLocation) {
      throw new BadRequestException(
        'Invalid locationId for first or last stop',
      );
    }

    const tripName = `${firstLocation.city} - ${lastLocation.city}`;
    const startTime = firstStop.departureTime;
    const endTime = lastStop.arrivalTime;

    const overlappingTrip = await this.prisma.trips.findFirst({
      where: {
        busId,
        OR: [
          {
            startTime: { lte: endTime },
            endTime: { gte: startTime },
          },
        ],
        status: { not: 'cancelled' },
      },
    });

    if (overlappingTrip) {
      throw new BadRequestException(
        'Bus has another trip overlapping with this time',
      );
    }

    const result = await this.prisma.$transaction(async (prisma) => {
      // create trip
      const trip = await prisma.trips.create({
        data: {
          tripName,
          busId,
          startTime,
          endTime,
        },
      });

      // create trip stops
      await prisma.tripStops.createMany({
        data: stops.map((s, idx) => ({
          tripId: trip.id,
          locationId: s.locationId,
          sequence: idx + 1,
          arrivalTime: idx === 0 ? null : s.arrivalTime,
          departureTime: idx === stops.length - 1 ? null : s.departureTime,
        })),
      });

      const createdStops = await prisma.tripStops.findMany({
        where: { tripId: trip.id },
        orderBy: { sequence: 'asc' },
      });

      // create trip segments
      const segments = createdStops.slice(0, -1).map((fromStop, idx) => {
        const toStop = createdStops[idx + 1];
        const durationMinutes =
          fromStop.departureTime && toStop.arrivalTime
            ? Math.round(
                (new Date(toStop.arrivalTime).getTime() -
                  new Date(fromStop.departureTime).getTime()) /
                  60000,
              )
            : null;

        return {
          tripId: trip.id,
          fromStopId: fromStop.id,
          toStopId: toStop.id,
          segmentIndex: idx + 1,
          durationMinutes,
        };
      });

      await prisma.tripSegments.createMany({ data: segments });

      await this.activityLogService.logAction({
        userId: userId,
        action: 'CREATE_TRIP',
        entityId: trip.id,
        entityType: 'Trips',
        metadata: {
          tripId: trip.id,
        },
        ipAddress: ip,
        userAgent: userAgent,
      });

      return prisma.trips.findUnique({
        where: { id: trip.id },
        include: { tripStops: true },
      });
    });

    await this.clearTripCache();
    return result;
  }

  async findAll(query: TripQueryDto) {
    const cacheKey = `trips:search:${JSON.stringify(query)}`;
    const cachedData = await this.cacheManager.get<Trips[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const {
      startTime,
      endTime,
      origin,
      destination,
      status,
      busId,
      includeStops,
      includeSegments,
    } = query;

    const where: Prisma.TripsWhereInput = {};
    const include: Prisma.TripsInclude = {};

    // Filter startTime range
    if (startTime || endTime) {
      where.startTime = {};

      if (startTime) where.startTime.gte = new Date(startTime);
      if (endTime) where.startTime.lte = new Date(endTime);
    }

    // Status
    if (status) {
      where.status = status;
    }

    // Bus
    if (busId) {
      where.busId = busId;
    }

    // Origin filter: trips that contain this location
    if (origin) {
      where.tripStops = {
        some: { locationId: origin },
      };
    }

    // Destination filter: trips that contain this location
    if (destination) {
      where.tripStops = {
        ...where.tripStops,
        some: { locationId: destination },
      };
    }

    // Includes
    include.bus = true;

    if (includeStops === 'true') {
      include.tripStops = {
        orderBy: { sequence: 'asc' },
        include: { location: true },
      };
    }

    if (includeSegments === 'true') {
      include.segments = {
        orderBy: { segmentIndex: 'asc' },
      };
    }

    // Query DB
    const trips = await this.prisma.trips.findMany({
      where,
      include: {
        ...include,
        tripStops: {
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // If both origin + destination → need to validate order
    if (origin && destination) {
      return trips.filter((trip) => {
        const stops = trip.tripStops;

        const originStop = stops.find((s) => s.locationId === origin);
        const destStop = stops.find((s) => s.locationId === destination);

        return (
          originStop && destStop && originStop.sequence < destStop.sequence
        );
      });
    }

    let result = trips;

    if (origin && destination) {
      result = trips.filter((trip) => {
        const stops = trip.tripStops;
        const originStop = stops.find((s) => s.locationId === origin);
        const destStop = stops.find((s) => s.locationId === destination);
        return (
          originStop && destStop && originStop.sequence < destStop.sequence
        );
      });
    }

    // 5. SET CACHE (Lưu 300s = 5 phút)
    await this.cacheManager.set(cacheKey, result, 300);
    return result;
  }

  async findOne(id: string, includeRoutes?: string) {
    const cacheKey = `trips:detail:${id}:routes:${includeRoutes || 'false'}`;
    const cachedData = await this.cacheManager.get<Trips>(cacheKey);
    if (cachedData) return cachedData;

    const include: any = {
      bus: true,
      tripStops: {
        orderBy: { sequence: 'asc' },
        include: { location: true },
      },
      segments: {
        orderBy: { segmentIndex: 'asc' },
      },
    };

    // Include tripRoutes with route and price if requested
    if (includeRoutes === 'true') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      include.tripRoutes = {
        include: {
          route: {
            include: {
              origin: true,
              destination: true,
            },
          },
        },
      };
    }

    const trip = await this.prisma.trips.findUnique({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      include,
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
    await this.cacheManager.set(cacheKey, trip, 600);
    return trip;
  }

  async update(
    tripId: string,
    dto: UpdateTripDto,
    userId: string,
    ip: string,
    userAgent: string,
  ) {
    const trip = await this.prisma.trips.findUnique({
      where: { id: tripId },
      include: { bookings: true, tripStops: true, segments: true },
    });

    if (!trip) throw new NotFoundException('Trip not found');

    if (trip.status !== 'scheduled') {
      throw new BadRequestException('Cannot update trip that is not scheduled');
    }

    if (trip.bookings.length > 0) {
      throw new BadRequestException(
        'Cannot update trip with existing bookings',
      );
    }

    const { busId, stops } = dto;

    // Validate new busId
    if (busId && busId !== trip.busId) {
      const bus = await this.prisma.buses.findUnique({ where: { id: busId } });
      if (!bus) throw new BadRequestException('Invalid busId');
    }

    let startTime: Date = trip.startTime;
    let endTime: Date = trip.endTime;
    let tripName = trip.tripName;

    if (stops) {
      if (stops.length < 2) {
        throw new BadRequestException('A trip must have at least 2 stops');
      }

      for (let i = 0; i < stops.length; i++) {
        const curr = stops[i];
        const arrival = curr.arrivalTime
          ? new Date(curr.arrivalTime).getTime()
          : null;
        const departure = curr.departureTime
          ? new Date(curr.departureTime).getTime()
          : null;

        if (arrival && departure && arrival > departure) {
          throw new BadRequestException(
            `Stop ${i + 1}: arrivalTime must be <= departureTime`,
          );
        }

        if (i > 0) {
          const prevDeparture = stops[i - 1].departureTime
            ? new Date(stops[i - 1].departureTime).getTime()
            : null;

          if (arrival && prevDeparture && arrival < prevDeparture) {
            throw new BadRequestException(
              `Stop ${i + 1}: arrivalTime overlaps with previous stop`,
            );
          }
        }
      }

      const firstStop = stops[0];
      const lastStop = stops[stops.length - 1];

      const firstLocation = await this.prisma.locations.findUnique({
        where: { id: stops[0].locationId },
      });
      const lastLocation = await this.prisma.locations.findUnique({
        where: { id: stops[stops.length - 1].locationId },
      });

      if (!firstLocation || !lastLocation) {
        throw new BadRequestException(
          'Invalid locationId for first or last stop',
        );
      }

      tripName = `${firstLocation.city} - ${lastLocation.city}`;
      startTime = new Date(firstStop.departureTime);
      endTime = new Date(lastStop.arrivalTime);
    }

    const overlappingTrip = await this.prisma.trips.findFirst({
      where: {
        busId,
        id: { not: tripId },
        OR: [
          {
            startTime: { lte: endTime },
            endTime: { gte: startTime },
          },
        ],
        status: { not: 'cancelled' },
      },
    });

    if (overlappingTrip) {
      throw new BadRequestException(
        'Bus has another trip overlapping with this time',
      );
    }

    return this.prisma.$transaction(async (prisma) => {
      await prisma.trips.update({
        where: { id: tripId },
        data: { busId: busId ?? trip.busId, tripName, startTime, endTime },
      });

      if (stops) {
        await prisma.tripSegments.deleteMany({ where: { tripId } });
        await prisma.tripStops.deleteMany({ where: { tripId } });

        await prisma.tripStops.createMany({
          data: stops.map((s, idx) => ({
            tripId,
            locationId: s.locationId,
            sequence: idx + 1,
            arrivalTime: idx === 0 ? null : s.arrivalTime,
            departureTime: idx === stops.length - 1 ? null : s.departureTime,
          })),
        });

        const createdStops = await prisma.tripStops.findMany({
          where: { tripId },
          orderBy: { sequence: 'asc' },
        });

        const segments = createdStops.slice(0, -1).map((fromStop, idx) => {
          const toStop = createdStops[idx + 1];
          const durationMinutes =
            fromStop.departureTime && toStop.arrivalTime
              ? Math.round(
                  (new Date(toStop.arrivalTime).getTime() -
                    new Date(fromStop.departureTime).getTime()) /
                    60000,
                )
              : null;
          return {
            tripId,
            fromStopId: fromStop.id,
            toStopId: toStop.id,
            segmentIndex: idx + 1,
            durationMinutes,
          };
        });

        await prisma.tripSegments.createMany({ data: segments });
      }
      await this.clearTripCache(tripId);
      await this.activityLogService.logAction({
        userId: userId,
        action: 'UPDATE_TRIP',
        entityType: 'Trips',
        entityId: trip.id,
        metadata: {
          tripId: trip.id,
        },
        ipAddress: ip,
        userAgent: userAgent,
      });

      return prisma.trips.findUnique({
        where: { id: tripId },
        include: {
          bus: true,
          tripStops: {
            orderBy: { sequence: 'asc' },
            include: { location: true },
          },
          segments: { orderBy: { segmentIndex: 'asc' } },
        },
      });
    });
  }

  async updateStatus(
    tripId: string,
    status: TripStatus,
    userId: string,
    ip: string,
    userAgent: string,
  ) {
    const trip = await this.prisma.trips.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    if (trip.status === status) {
      throw new BadRequestException(`Trip is already ${status}`);
    }

    const updatedTrip = await this.prisma.trips.update({
      where: { id: tripId },
      data: { status },
    });

    await this.clearTripCache(tripId);
    await this.activityLogService.logAction({
      userId: userId,
      action: 'UPDATE_STATUS_TRIP',
      entityType: 'Trips',
      entityId: trip.id,
      metadata: {
        tripId: trip.id,
      },
      ipAddress: ip,
      userAgent: userAgent,
    });

    return updatedTrip;
  }

  async remove(tripId: string, userId: string, ip: string, userAgent: string) {
    const trip = await this.prisma.trips.findUnique({
      where: { id: tripId },
      include: { bookings: true },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.bookings.length > 0) {
      throw new BadRequestException(
        'Cannot delete trip with existing bookings',
      );
    }

    await this.activityLogService.logAction({
      userId: userId,
      action: 'DELETE_TRIP',
      entityType: 'Trips',
      entityId: trip.id,
      metadata: {
        tripId: trip.id,
      },
      ipAddress: ip,
      userAgent: userAgent,
    });

    await this.clearTripCache(tripId);
    return this.prisma.$transaction(async (prisma) => {
      await prisma.tripSegments.deleteMany({ where: { tripId } });

      await prisma.tripStops.deleteMany({ where: { tripId } });

      return prisma.trips.delete({ where: { id: tripId } });
    });
  }

  async getSeatsStatus(tripId: string, routeId: string) {
    try {
      const trip = await this.prisma.trips.findUnique({
        where: { id: tripId },
        include: {
          bus: {
            include: {
              seats: {
                orderBy: { seatNumber: 'asc' },
              },
            },
          },
        },
      });

      if (!trip) throw new NotFoundException('Trip not found');
      if (!trip.bus)
        throw new NotFoundException('Bus assigned to trip not found');

      const route = await this.prisma.routes.findUnique({
        where: { id: routeId },
        select: { originLocationId: true, destinationLocationId: true },
      });

      if (!route) throw new NotFoundException('Route not found');

      const stops = await this.prisma.tripStops.findMany({
        where: {
          tripId,
          locationId: {
            in: [route.originLocationId, route.destinationLocationId],
          },
        },
        select: { id: true, sequence: true, locationId: true },
      });

      const startStop = stops.find(
        (s) => s.locationId === route.originLocationId,
      );
      const endStop = stops.find(
        (s) => s.locationId === route.destinationLocationId,
      );

      if (!startStop || !endStop) {
        throw new BadRequestException(
          'This Trip does not cover the selected Route locations',
        );
      }
      if (startStop.sequence >= endStop.sequence) {
        throw new BadRequestException('Invalid route direction for this trip');
      }

      const relevantSegments = await this.prisma.tripSegments.findMany({
        where: {
          tripId,
          fromStop: { sequence: { gte: startStop.sequence } },
          toStop: { sequence: { lte: endStop.sequence } },
        },
        select: { id: true },
      });

      const segmentIds = relevantSegments.map((s) => s.id);

      // Collect booked seat IDs from multiple sources
      const bookedSeatIds = new Set<string>();

      const lockPattern = `lock:trip:${tripId}:*`;
      const activeLocks = await this.cacheManager.keys(lockPattern);

      if (activeLocks && activeLocks.length > 0) {
        activeLocks.forEach((key) => {
          const parts = key.split(':');
          const segId = parts[4];
          const seatId = parts[6];
          if (segmentIds.includes(segId)) {
            bookedSeatIds.add(seatId);
          }
        });
      }

      // Method 1: Check SeatSegmentLocks (if segments exist)
      if (segmentIds.length > 0) {
        const lockedSeats = await this.prisma.seatSegmentLocks.findMany({
          where: {
            tripId,
            segmentId: { in: segmentIds },
          },
          select: { seatId: true },
        });
        lockedSeats.forEach((lock) => bookedSeatIds.add(lock.seatId));
      }

      // Method 2: Check Bookings table directly (fallback when no segments)
      const bookedFromBookings = await this.prisma.bookings.findMany({
        where: {
          tripId,
          routeId,
          status: { in: ['confirmed', 'pendingPayment'] },
        },
        select: { seatId: true },
      });
      bookedFromBookings.forEach((b) => bookedSeatIds.add(b.seatId));

      console.log('=== SEAT STATUS DEBUG ===');
      console.log('tripId:', tripId, 'routeId:', routeId);
      console.log('segmentIds count:', segmentIds.length);
      console.log('bookedFromBookings count:', bookedFromBookings.length);
      console.log('Total booked seats:', bookedSeatIds.size);
      console.log('=========================');

      const lockedSeatIds = bookedSeatIds;

      const result = trip.bus.seats.map((seat) => {
        const isLocked = lockedSeatIds.has(seat.id);
        return {
          seatId: seat.id,
          seatNumber: seat.seatNumber,
          status: isLocked ? 'BOOKED' : 'AVAILABLE',
        };
      });

      return {
        message: 'Fetched seat status successfully',
        data: result,
        meta: {
          totalSeats: result.length,
          availableSeats: result.filter((s) => s.status === 'AVAILABLE').length,
        },
      };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to fetch seat status', {
        cause: err,
      });
    }
  }

  /**
   * Search trips by city names and departure date.
   * This method allows searching by city name (e.g., "HCMC") and will find all locations in that city.
   * Time is taken from trip stops instead of trip start/end times.
   */
  async searchTrips(searchDto: SearchTripDto) {
    try {
      const cacheKey = `trips:city-search:${JSON.stringify(searchDto)}`;
      const cachedData = await this.cacheManager.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const {
        originCity,
        destinationCity,
        departureDate,
        includeStops,
        includeRoutes,
      } = searchDto;

      let originLocationIds: string[] = [];
      let destinationLocationIds: string[] = [];

      // Get all locations for origin city
      if (originCity) {
        const normalizedOrigin = normalizeCity(originCity);

        // First try to find exact match
        let originLocations = await this.prisma.locations.findMany({
          where: {
            city: {
              equals: normalizedOrigin,
              mode: 'insensitive',
            },
          },
          select: { id: true, city: true },
        });

        // If no exact match, try fuzzy search
        if (originLocations.length === 0) {
          const allCities = await this.prisma.locations.findMany({
            distinct: ['city'],
            select: { city: true },
          });

          const matchedCity = allCities.find(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
            (item: any) => normalizeCity(item.city) === normalizedOrigin,
          );

          if (matchedCity) {
            originLocations = await this.prisma.locations.findMany({
              where: { city: matchedCity.city },
              select: { id: true, city: true },
            });
          } else {
            // Try partial match
            originLocations = await this.prisma.locations.findMany({
              where: {
                city: {
                  contains: originCity.trim(),
                  mode: 'insensitive',
                },
              },
              select: { id: true, city: true },
            });
          }
        }

        originLocationIds = originLocations.map((loc) => loc.id);
      }

      // Get all locations for destination city
      if (destinationCity) {
        const normalizedDestination = normalizeCity(destinationCity);

        // First try to find exact match
        let destinationLocations = await this.prisma.locations.findMany({
          where: {
            city: {
              equals: normalizedDestination,
              mode: 'insensitive',
            },
          },
          select: { id: true, city: true },
        });

        // If no exact match, try fuzzy search
        if (destinationLocations.length === 0) {
          const allCities = await this.prisma.locations.findMany({
            distinct: ['city'],
            select: { city: true },
          });

          const matchedCity = allCities.find(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
            (item: any) => normalizeCity(item.city) === normalizedDestination,
          );

          if (matchedCity) {
            destinationLocations = await this.prisma.locations.findMany({
              where: { city: matchedCity.city },
              select: { id: true, city: true },
            });
          } else {
            // Try partial match
            destinationLocations = await this.prisma.locations.findMany({
              where: {
                city: {
                  contains: destinationCity.trim(),
                  mode: 'insensitive',
                },
              },
              select: { id: true, city: true },
            });
          }
        }

        destinationLocationIds = destinationLocations.map((loc) => loc.id);
      }

      // Build where condition for trips
      const where: Prisma.TripsWhereInput = {
        status: 'scheduled', // Only show scheduled trips
        AND: [],
      };

      // Add date filter based on trip stops departure time
      if (departureDate) {
        const startOfDay = new Date(departureDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(departureDate);
        endOfDay.setHours(23, 59, 59, 999);

        (where.AND as any[]).push({
          tripStops: {
            some: {
              departureTime: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
          },
        });
      }

      // Add origin filter
      if (originLocationIds.length > 0) {
        (where.AND as any[]).push({
          tripStops: {
            some: {
              locationId: {
                in: originLocationIds,
              },
            },
          },
        });
      }

      // Add destination filter
      if (destinationLocationIds.length > 0) {
        (where.AND as any[]).push({
          tripStops: {
            some: {
              locationId: {
                in: destinationLocationIds,
              },
            },
          },
        });
      }

      // Build include condition
      const include: Prisma.TripsInclude = {
        bus: true,
        tripStops: {
          orderBy: { sequence: 'asc' },
          include: {
            location: true,
          },
        },
      };

      if (includeRoutes === 'true') {
        include.tripRoutes = {
          include: {
            route: {
              include: {
                origin: true,
                destination: true,
              },
            },
          },
        };
      }

      // Query trips
      const trips = await this.prisma.trips.findMany({
        where,
        include,
        orderBy: { startTime: 'asc' },
      });

      // Filter trips to ensure origin comes before destination in the route
      let filteredTrips = trips;
      if (originLocationIds.length > 0 && destinationLocationIds.length > 0) {
        filteredTrips = trips.filter((trip) => {
          const stops = trip.tripStops;

          const originStop = stops.find((s) =>
            originLocationIds.includes(s.locationId),
          );
          const destinationStop = stops.find((s) =>
            destinationLocationIds.includes(s.locationId),
          );

          return (
            originStop &&
            destinationStop &&
            originStop.sequence < destinationStop.sequence
          );
        });
      }

      // Transform response to include route information based on trip stops
      const response = filteredTrips.map((trip) => {
        const stops = trip.tripStops;
        const firstStop = stops[0];
        const lastStop = stops[stops.length - 1];

        // Find relevant origin and destination stops for this search
        let relevantOriginStop = firstStop;
        let relevantDestinationStop = lastStop;

        if (originLocationIds.length > 0) {
          relevantOriginStop =
            stops.find((s) => originLocationIds.includes(s.locationId)) ||
            firstStop;
        }

        if (destinationLocationIds.length > 0) {
          relevantDestinationStop =
            stops.find((s) => destinationLocationIds.includes(s.locationId)) ||
            lastStop;
        }

        return {
          ...trip,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          routeName: `${(relevantOriginStop as any).location?.city || 'Unknown'} - ${(relevantDestinationStop as any).location?.city || 'Unknown'}`,
          departureTime: relevantOriginStop.departureTime,
          arrivalTime: relevantDestinationStop.arrivalTime,
          originStop: relevantOriginStop,
          destinationStop: relevantDestinationStop,
          // Remove detailed stops if not requested
          ...(includeStops !== 'true' && { tripStops: undefined }),
        };
      });

      // Cache for 5 minutes
      await this.cacheManager.set(cacheKey, response, 300);

      return {
        message: 'Search trips successfully',
        data: response,
        count: response.length,
        searchCriteria: {
          originCity,
          destinationCity,
          departureDate,
          foundOriginLocations: originLocationIds.length,
          foundDestinationLocations: destinationLocationIds.length,
        },
      };
    } catch (error: unknown) {
      throw new InternalServerErrorException('Failed to search trips', {
        cause: error,
      });
    }
  }

  async getUpcomingTrips(limit: number = 5) {
    try {
      const trips = await this.prisma.trips.findMany({
        where: {
          startTime: { gte: new Date() },
          status: { not: TripStatus.cancelled },
        },
        orderBy: { startTime: 'asc' },
        take: limit,
        include: {
          bus: {
            select: {
              plate: true,
              _count: { select: { seats: true } },
            },
          },
          _count: {
            select: {
              bookings: { where: { status: 'confirmed' } },
            },
          },
          tripStops: {
            orderBy: { sequence: 'asc' },
            include: { location: true },
          },
        },
      });

      return trips.map((trip) => {
        const origin = trip.tripStops[0]?.location?.city || 'Unknown';
        const destination =
          trip.tripStops[trip.tripStops.length - 1]?.location?.city ||
          'Unknown';

        const totalSeats = trip.bus?._count?.seats || 0;
        const bookedSeats = trip._count?.bookings || 0;

        let displayStatus: string = trip.status;
        if (bookedSeats >= totalSeats) {
          displayStatus = 'Full';
        } else if (
          new Date(trip.startTime).getTime() - new Date().getTime() <
          30 * 60 * 1000
        ) {
          displayStatus = 'Boarding';
        }

        return {
          id: trip.id,
          route: `${origin} - ${destination}`,
          startTime: trip.startTime,
          busPlate: trip.bus?.plate || 'N/A',
          totalSeats,
          bookedSeats,
          seatsInfo: `${bookedSeats}/${totalSeats}`,
          status: displayStatus,
        };
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException('Failed to fetch upcoming trips', {
        cause: error,
      });
    }
  }
}
