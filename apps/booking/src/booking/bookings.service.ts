import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { BookingsGateway } from './bookings.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService, BaseResponse } from '@app/shared';
import {
  CreateBookingDto,
  QueryBookingDto,
  LookupBookingDto,
  ModifyBookingDto,
} from '@app/shared/dto';
import { BookingStatus, SettingKey } from '@app/shared/enums';
import { generateBookingReference } from '@app/shared';
import { ETicketService } from '../eticket/eticket.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheManager: RedisCacheService,
    private readonly bookingsGateway: BookingsGateway,
    private readonly eTicketService: ETicketService,
    @Inject('TRIP_SERVICE') private readonly tripClient: ClientProxy,
    @Inject('SUPPORT_SERVICE') private readonly supportClient: ClientProxy,
  ) {}

  private async getSetting(key: SettingKey) {
    try {
      const res = await firstValueFrom(
        this.supportClient.send<BaseResponse<any>>({ cmd: 'get_setting' }, key),
      );
      return res.data;
    } catch (e) {
      this.logger.error(`Failed to fetch setting ${key}`, e);
      return null;
    }
  }

  private async getTripDetail(tripId: string) {
    try {
      const res = await firstValueFrom(
        this.tripClient.send<BaseResponse<any>>(
          { cmd: 'get_trip_detail' },
          { id: tripId, includeRoutes: 'false' },
        ),
      );
      return res.data;
    } catch (e) {
      this.logger.error(`Failed to fetch trip ${tripId}`, e);
      throw new NotFoundException('Trip not found or service unavailable');
    }
  }

  private async getTripRouteMap(tripId: string, routeId: string) {
    try {
      const res = await firstValueFrom(
        this.tripClient.send<BaseResponse<any>>(
          { cmd: 'get_trip_route_map_detail' },
          { tripId, routeId },
        ),
      );
      return res.data;
    } catch (e) {
      throw new NotFoundException('Route not available for selected trip');
    }
  }

  private async generateUniqueTicketCode(): Promise<string> {
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const code = generateBookingReference();
      const existing = await this.prisma.bookings.findUnique({
        where: { ticketCode: code },
      });
      if (!existing) return code;
    }
    throw new InternalServerErrorException(
      'Failed to generate unique booking reference',
    );
  }

  private async calculateDetailsFromRoute(tripId: string, routeId: string) {
    const trip = await this.getTripDetail(tripId);

    const routeRes = await firstValueFrom(
      this.tripClient.send<BaseResponse<any>>(
        { cmd: 'find_one_route' },
        routeId,
      ),
    );
    const route = routeRes.data;

    const stops = trip.tripStops.filter((s: any) =>
      [route.originLocationId, route.destinationLocationId].includes(
        s.locationId,
      ),
    );

    const startStop = stops.find(
      (s: any) => s.locationId === route.originLocationId,
    );
    const endStop = stops.find(
      (s: any) => s.locationId === route.destinationLocationId,
    );

    if (!startStop || !endStop) {
      throw new BadRequestException(
        'Trip does not stop at the Route locations',
      );
    }
    if (startStop.sequence >= endStop.sequence) {
      throw new BadRequestException('Invalid route direction');
    }

    const segments = trip.segments.filter(
      (s: any) =>
        s.segmentIndex >= startStop.sequence &&
        s.segmentIndex < endStop.sequence,
    );

    return {
      segmentIds: segments.map((s: any) => s.id),
      pickupStopId: startStop.id,
      dropoffStopId: endStop.id,
    };
  }

  async lockSeat(
    userId: string,
    tripId: string,
    seatId: string,
    routeId: string,
  ) {
    const { segmentIds } = await this.calculateDetailsFromRoute(
      tripId,
      routeId,
    );
    const TTL = 300;

    const isBookedInDb = await this.prisma.seatSegmentLocks.findFirst({
      where: { tripId, seatId, segmentId: { in: segmentIds } },
    });
    if (isBookedInDb)
      throw new ConflictException(
        'Seat is already booked for this route segment.',
      );

    for (const segId of segmentIds) {
      const lockKey = `lock:trip:${tripId}:segment:${segId}:seat:${seatId}`;
      const holder = await this.cacheManager.get(lockKey);

      if (holder && holder !== userId) {
        throw new ConflictException(
          `Ghế đang được giữ bởi người khác ở đoạn ${segId}`,
        );
      }
    }

    const lockPromises = segmentIds.map((segId) => {
      const lockKey = `lock:trip:${tripId}:segment:${segId}:seat:${seatId}`;
      return this.cacheManager.set(lockKey, userId, TTL);
    });

    await Promise.all(lockPromises);
    this.bookingsGateway.emitSeatLocked(tripId, seatId, segmentIds);

    return { message: 'Seat locked successfully', expiresIn: TTL };
  }

  async unlockSeat(
    userId: string,
    tripId: string,
    seatId: string,
    routeId: string,
  ) {
    const { segmentIds } = await this.calculateDetailsFromRoute(
      tripId,
      routeId,
    );

    const unlockPromises = segmentIds.map(async (segId) => {
      const lockKey = `lock:trip:${tripId}:segment:${segId}:seat:${seatId}`;
      const holderId = await this.cacheManager.get<string>(lockKey);

      if (holderId && holderId === userId) {
        await this.cacheManager.del(lockKey);
      }
    });

    await Promise.all(unlockPromises);
    this.bookingsGateway.emitSeatUnlocked(tripId, seatId, segmentIds);

    return { message: 'Seat unlocked successfully' };
  }

  async create(createBookingDto: CreateBookingDto) {
    try {
      const { userId, tripId, seatId, seatIds, routeId, customerInfo } =
        createBookingDto;
      const allSeatIds = seatIds?.length ? seatIds : seatId ? [seatId] : [];

      if (allSeatIds.length === 0) {
        throw new BadRequestException('At least one seat must be selected');
      }

      const { segmentIds, pickupStopId, dropoffStopId } =
        await this.calculateDetailsFromRoute(tripId, routeId);
      const lockIdentifier = userId || 'guest-temp-id';

      const tripRoute = await this.getTripRouteMap(tripId, routeId);

      const result = await this.prisma.$transaction(async (tx) => {
        const bookings = [];
        let totalPrice = 0;

        for (const currentSeatId of allSeatIds) {
          const existingBooking = await tx.bookings.findFirst({
            where: {
              tripId,
              seatId: currentSeatId,
              status: { in: ['confirmed', 'pendingPayment'] },
            },
          });

          if (segmentIds.length > 0) {
            const conflictLock = await tx.seatSegmentLocks.findFirst({
              where: {
                tripId,
                seatId: currentSeatId,
                segmentId: { in: segmentIds },
              },
            });
            if (conflictLock)
              throw new ConflictException(`Seat ${currentSeatId} is conflict.`);
          }

          const ticketCode = await this.generateUniqueTicketCode();

          const booking = await tx.bookings.create({
            data: {
              customerInfo: customerInfo as unknown as Prisma.InputJsonValue,
              price: tripRoute.price,
              status: BookingStatus.pendingPayment,
              ticketCode,
              tripId,
              routeId,
              seatId: currentSeatId,
              pickupStopId,
              dropoffStopId,
              userId: userId || undefined,
            },
          });

          if (segmentIds.length > 0) {
            await tx.seatSegmentLocks.createMany({
              data: segmentIds.map((segId: string) => ({
                tripId,
                seatId: currentSeatId,
                segmentId: segId,
                bookingId: booking.id,
              })),
            });
          }

          await Promise.all(
            segmentIds.map((segId) =>
              this.cacheManager.del(
                `lock:trip:${tripId}:segment:${segId}:seat:${currentSeatId}`,
              ),
            ),
          );

          bookings.push({
            bookingId: booking.id,
            ticketCode: booking.ticketCode,
          });
          totalPrice += Number(tripRoute.price);
        }

        return {
          bookingIds: bookings.map((b) => b.bookingId),
          ticketCodes: bookings.map((b) => b.ticketCode),
          totalPrice,
          status: BookingStatus.pendingPayment,
        };
      });

      for (const currentSeatId of allSeatIds) {
        this.bookingsGateway.emitSeatSold(tripId, currentSeatId, segmentIds);
      }

      return { message: 'Booking initiated successfully', data: result };
    } catch (err) {
      if (
        err instanceof ConflictException ||
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      )
        throw err;
      throw new InternalServerErrorException('Failed to create booking', {
        cause: err,
      });
    }
  }

  async findOne(id: string) {
    const booking = await this.prisma.bookings.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    const [trip, route] = await Promise.all([
      this.getTripDetail(booking.tripId),
      firstValueFrom(
        this.tripClient.send({ cmd: 'find_one_route' }, booking.routeId),
      ).then((r) => r.data),
    ]);

    return {
      message: 'Fetched booking details successfully',
      data: {
        ...booking,
        trip: {
          tripName: trip.tripName,
          startTime: trip.startTime,
          bus: trip.bus,
        },
        route: { name: route.name },
      },
    };
  }

  async findAll(query: QueryBookingDto) {
    const {
      page = 1,
      limit = 10,
      status,
      userId,
      tripId,
      dateFrom,
      dateTo,
    } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.BookingsWhereInput = {
      AND: [
        status ? { status } : {},
        userId ? { userId } : {},
        tripId ? { tripId } : {},
      ],
    };

    const [bookings, total] = await Promise.all([
      this.prisma.bookings.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bookings.count({ where }),
    ]);

    return {
      message: 'Fetched bookings successfully',
      data: bookings,
      meta: { total, page: Number(page), limit: Number(limit) },
    };
  }

  async getStats() {
    return { message: 'Stats fetched' };
  }

  async sendETicketEmail(ticketCode: string) {
    try {
      const ticketData = await this.eTicketService.getBookingData(ticketCode);
      const pdfBuffer = await this.eTicketService.generatePDF(ticketCode);

      this.supportClient.emit('send_email', {
        type: 'ETICKET',
        to: ticketData.email,
        subject: `E-Ticket ${ticketCode}`,
        payload: {
          ticketCode,
          passengerName: ticketData.passengerName,
          route: `${ticketData.from} - ${ticketData.to}`,
        },
        attachment: pdfBuffer.toString('base64'),
      });

      return { message: 'E-ticket email queued successfully' };
    } catch (err) {
      throw new InternalServerErrorException('Failed to process e-ticket');
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleBookingExpiration() {
    try {
      const bookingRule = await this.getSetting(SettingKey.BOOKING_RULES);
      const holdTime = bookingRule?.paymentHoldTimeMinutes ?? 15;
      const expirationThreshold = new Date(Date.now() - holdTime * 60 * 1000);

      const expiredBookings = await this.prisma.bookings.findMany({
        where: {
          status: BookingStatus.pendingPayment,
          createdAt: { lt: expirationThreshold },
        },
      });

      for (const booking of expiredBookings) {
        await this.prisma.$transaction(async (tx) => {
          await tx.bookings.update({
            where: { id: booking.id },
            data: { status: BookingStatus.cancelled },
          });

          const locks = await tx.seatSegmentLocks.findMany({
            where: { bookingId: booking.id },
          });
          await tx.seatSegmentLocks.deleteMany({
            where: { bookingId: booking.id },
          });

          const segmentIds = locks.map((l) => l.segmentId);
          this.bookingsGateway.emitSeatUnlocked(
            booking.tripId,
            booking.seatId,
            segmentIds,
          );
        });
      }
    } catch (error) {
      this.logger.error('Error in expiration job', error);
    }
  }
}
