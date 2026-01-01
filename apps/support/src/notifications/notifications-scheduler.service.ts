import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { Prisma } from '@prisma/client-support';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SmsService } from './sms.service';
import { NotificationsService } from './notifications.service';
import { lastValueFrom } from 'rxjs';
import { BaseResponse } from '@app/shared';
import {
  BookingUpcomingForReminderDto,
  BookingReminderItemDto,
} from '@app/shared/dto';

interface BookingData {
  id: string;
  userId: string | null;
  ticketCode: string | null;
  customerInfo: Prisma.JsonValue;
  user: {
    email?: string;
    phoneNumber?: string | null;
    fullName?: string | null;
  } | null;
  trip: {
    startTime: Date;
    bus: {
      plate: string;
    };
  };
  route: {
    origin: {
      name: string;
    };
    destination: {
      name: string;
    };
  };
  pickupStop: {
    location: {
      name: string;
      address?: string | null;
    };
  };
  dropoffStop: any;
  seat: {
    seatNumber: string;
  };
}

@Injectable()
export class NotificationsSchedulerService {
  private readonly logger = new Logger(NotificationsSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly notificationsService: NotificationsService,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
  ) {}

  private toBookingData(dto: BookingReminderItemDto): BookingData {
    return {
      ...dto,
      trip: {
        ...dto.trip,
        startTime: new Date(dto.trip.startTime),
        bus: {
          plate: dto.trip.bus.plate ?? '',
        },
      },
      route: {
        origin: { name: dto.route.origin.name ?? '' },
        destination: { name: dto.route.destination.name ?? '' },
      },
      pickupStop: {
        location: {
          name: dto.pickupStop?.location?.name ?? '',
          address: dto.pickupStop?.location?.address ?? '',
        },
      },
      seat: { seatNumber: dto.seat.seatNumber ?? '' },
      customerInfo: dto.customerInfo as unknown as Prisma.JsonValue,
      dropoffStop: dto.dropoffStop as {
        location: {
          name: string | null;
          address?: string | null | undefined;
        };
      } | null,
      userId: dto.userId,
      ticketCode: dto.ticketCode,
      user: dto.user,
      id: dto.id,
    };
  }

  /**
   * Runs every hour to check for trips departing in the next 24 hours
   * and sends reminder notifications to passengers
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendTripReminders() {
    this.logger.log('Running trip reminder job...');

    try {
      // Get current time and 24 hours from now
      const now = new Date();
      const twentyFourHoursLater = new Date(
        now.getTime() + 24 * 60 * 60 * 1000,
      );

      // Find all bookings with trips departing in the next 24 hours
      const res = await lastValueFrom(
        this.bookingClient.send<BaseResponse<BookingReminderItemDto[]>>(
          { cmd: 'booking_upcoming_for_reminder' },
          {
            from: now.toISOString(),
            to: twentyFourHoursLater.toISOString(),
          } satisfies BookingUpcomingForReminderDto,
        ),
      );

      const upcomingBookings = res?.data ?? [];

      this.logger.log(
        `Found ${upcomingBookings.length} upcoming trips to send reminders for`,
      );

      for (const booking of upcomingBookings) {
        try {
          const bookingData = this.toBookingData(booking);
          // Check if reminder notification already sent
          const existingNotification =
            await this.prisma.notifications.findFirst({
              where: {
                bookingId: bookingData.id,
                template: 'trip_reminder',
                status: 'sent',
              },
            });

          if (existingNotification) {
            this.logger.debug(
              `Reminder already sent for booking ${bookingData.ticketCode}`,
            );
            continue;
          }

          const customerInfo = bookingData.customerInfo as Record<string, any>;
          const userEmail = (bookingData.user?.email || customerInfo?.email) as
            | string
            | undefined;
          const userPhone = (bookingData.user?.phoneNumber ||
            customerInfo?.phoneNumber) as string | undefined;

          let emailSent = false;
          let smsSent = false;

          // Send email notification if user has email
          if (userEmail) {
            try {
              await this.sendTripReminderEmail(bookingData);
              emailSent = true;

              // Create notification record for tracking (works for both guests and authenticated users)
              await this.prisma.notifications.create({
                data: {
                  userId: bookingData.userId,
                  bookingId: bookingData.id,
                  type: 'email',
                  template: 'trip_reminder',
                  content: `Your trip to ${bookingData.route.destination.name} departs tomorrow at ${bookingData.trip.startTime.toLocaleTimeString()}. Please arrive 30 minutes early.`,
                  status: 'sent',
                  sentAt: new Date(),
                },
              });

              this.logger.log(
                `Email reminder sent for booking ${bookingData.ticketCode}${!bookingData.userId ? ' (guest)' : ''}`,
              );
            } catch (error) {
              this.logger.error(
                `Failed to send email for booking ${bookingData.ticketCode}:`,
                error,
              );
            }
          }

          // Send SMS notification if user has phone number and SMS service is available
          if (userPhone && this.smsService.isServiceAvailable()) {
            try {
              const reminderDetails =
                this.prepareTripReminderDetails(bookingData);
              const smsResult = await this.smsService.sendTripReminderSms(
                userPhone,
                reminderDetails,
              );

              if (smsResult.success) {
                smsSent = true;

                // Create notification record for tracking (works for both guests and authenticated users)
                await this.prisma.notifications.create({
                  data: {
                    userId: booking.userId,
                    bookingId: booking.id,
                    type: 'sms',
                    template: 'trip_reminder',
                    content: `SMS reminder sent to ${userPhone}`,
                    status: 'sent',
                    sentAt: new Date(),
                  },
                });

                this.logger.log(
                  `SMS reminder sent for booking ${booking.ticketCode}${!booking.userId ? ' (guest)' : ''}`,
                );
              }
            } catch (error) {
              this.logger.error(
                `Failed to send SMS for booking ${booking.ticketCode}:`,
                error,
              );
            }
          }

          if (emailSent || smsSent) {
            this.logger.log(
              `Reminders sent for ${booking.ticketCode}: Email=${emailSent}, SMS=${smsSent}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to send reminder for booking ${booking.ticketCode}:`,
            error,
          );
        }
      }

      this.logger.log('Trip reminder job completed');
    } catch (error) {
      this.logger.error('Error in trip reminder job:', error);
    }
  }

  /**
   * Sends a trip reminder email to the passenger
   */
  private async sendTripReminderEmail(booking: BookingData) {
    const reminderDetails = this.prepareTripReminderDetails(booking);
    const customerInfo = booking.customerInfo as Record<string, unknown> | null;
    const email = (booking.user?.email || customerInfo?.email) as string;

    await this.emailService.sendTripReminderEmail(email, reminderDetails);
  }

  /**
   * Prepare trip reminder details for email and SMS
   */
  private prepareTripReminderDetails(booking: BookingData) {
    const customerInfo = booking.customerInfo as Record<string, unknown> | null;
    const customerName = (booking.user?.fullName ||
      customerInfo?.fullName ||
      'Valued Customer') as string;

    const tripDate = new Date(booking.trip.startTime);
    const formattedDate = tripDate.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = tripDate.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const hoursUntilTrip = Math.floor(
      (tripDate.getTime() - new Date().getTime()) / (1000 * 60 * 60),
    );

    return {
      customerName,
      ticketCode: booking.ticketCode || 'N/A',
      tripDate: formattedDate,
      tripTime: formattedTime,
      origin: booking.route.origin.name,
      destination: booking.route.destination.name,
      pickupLocation: booking.pickupStop.location.name,
      pickupAddress: booking.pickupStop.location.address || '',
      seatNumber: booking.seat.seatNumber,
      busPlate: booking.trip.bus.plate,
      hoursUntilTrip,
    };
  }

  /**
   * Cleanup old notifications (optional - runs daily)
   * Removes notifications older than 30 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldNotifications() {
    this.logger.log('Running notification cleanup job...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.prisma.notifications.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
          status: 'sent',
        },
      });

      this.logger.log(`Cleaned up ${result.count} old notifications`);
    } catch (error) {
      this.logger.error('Error in notification cleanup job:', error);
    }
  }
}
