import { BadRequestException, Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { SmsService } from './sms.service';

@Controller()
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  /**
   * Trip reminder SMS
   * emit('sms.trip_reminder', { phoneNumber, reminderDetails })
   */
  @EventPattern('sms.trip_reminder')
  async tripReminder(
    @Payload()
    body: {
      phoneNumber: string;
      reminderDetails: {
        customerName: string;
        ticketCode: string;
        tripDate: string;
        tripTime: string;
        origin: string;
        destination: string;
        pickupLocation: string;
        seatNumber: string;
        hoursUntilTrip: number;
      };
    },
  ) {
    if (!body?.phoneNumber)
      throw new BadRequestException('phoneNumber is required');
    if (!body?.reminderDetails)
      throw new BadRequestException('reminderDetails is required');

    return this.smsService.sendTripReminderSms(
      body.phoneNumber,
      body.reminderDetails,
    );
  }

  /**
   * Booking confirmation SMS
   * emit('sms.booking_confirmation', { phoneNumber, details })
   */
  @EventPattern('sms.booking_confirmation')
  async bookingConfirmation(
    @Payload()
    body: {
      phoneNumber: string;
      details: {
        customerName: string;
        ticketCode: string;
        tripDate: string;
        tripTime: string;
        origin: string;
        destination: string;
        seatNumber: string;
        price: string;
      };
    },
  ) {
    if (!body?.phoneNumber)
      throw new BadRequestException('phoneNumber is required');
    if (!body?.details) throw new BadRequestException('details is required');

    return this.smsService.sendBookingConfirmationSms(
      body.phoneNumber,
      body.details,
    );
  }

  /**
   * General SMS
   * emit('sms.send', { phoneNumber, message })
   */
  @EventPattern('sms.send')
  async sendGeneral(@Payload() body: { phoneNumber: string; message: string }) {
    if (!body?.phoneNumber)
      throw new BadRequestException('phoneNumber is required');
    if (!body?.message) throw new BadRequestException('message is required');

    return this.smsService.sendNotificationSms(body.phoneNumber, body.message);
  }
}
