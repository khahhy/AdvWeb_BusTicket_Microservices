import { Inject, Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio';
import { PrismaService } from '../prisma/prisma.service';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { UserDto } from '@app/shared/dto';
import { BaseResponse } from '@app/shared';

interface NotificationPreferences {
  email?: Record<string, boolean>;
  sms?: Record<string, boolean>;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: Twilio;

  constructor(
    private prisma: PrismaService,
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
  ) {
    // Initialize Twilio client if credentials are available
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      this.twilioClient = new Twilio(accountSid, authToken);
      this.logger.log('Twilio SMS service initialized');
    } else {
      this.logger.warn(
        'Twilio credentials not found. SMS functionality will be disabled.',
      );
    }
  }

  /**
   * Check if SMS service is available
   */
  isServiceAvailable(): boolean {
    return !!this.twilioClient;
  }

  /**
   * Check if user has SMS notifications enabled for a specific type
   */
  async checkSmsPreference(
    userId: string,
    notificationType: 'booking' | 'payment' | 'reminder' | 'promotion',
  ): Promise<boolean> {
    try {
      const res = await lastValueFrom(
        this.identityClient.send<BaseResponse<UserDto>>(
          { cmd: 'user_get_notification_preferences' },
          userId,
        ),
      );

      const prefs = (res?.data ?? {}) as NotificationPreferences;

      return prefs.sms?.[notificationType] !== false;
    } catch (error) {
      this.logger.error('Error checking SMS preferences:', error);
      // Default to enabled on error
      return true;
    }
  }

  /**
   * Send a trip reminder SMS to a phone number
   */
  async sendTripReminderSms(
    phoneNumber: string,
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
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.twilioClient) {
      this.logger.warn('Twilio client not initialized. SMS not sent.');
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const { customerName, tripTime, origin, destination, hoursUntilTrip } =
        reminderDetails;

      // Format phone number (ensure it has country code)
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Create SMS message (max 160 characters for single SMS, or use up to 1600 for multi-part)
      const message = `Hi ${customerName}!
Your trip departs in ${hoursUntilTrip}h ${origin} → ${destination}
Time: ${tripTime}
Arrive 30 min early with your ID!`;

      const result = await this.twilioClient.messages.create({
        body: message,
        from: '+18168269845', // US number from Three2Go service
        to: formattedPhone,
      });

      this.logger.log(
        `SMS sent successfully to ${formattedPhone}. SID: ${result.sid}`,
      );

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phoneNumber}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send a booking confirmation SMS
   */
  async sendBookingConfirmationSms(
    phoneNumber: string,
    details: {
      customerName: string;
      ticketCode: string;
      tripDate: string;
      tripTime: string;
      origin: string;
      destination: string;
      seatNumber: string;
      price: string;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.twilioClient) {
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const message = `Booking Confirmed!
Hi ${details.customerName}!
Trip: ${details.origin} to ${details.destination}
Date: ${details.tripDate} at ${details.tripTime}
Ticket: ${details.ticketCode}`;

      const result = await this.twilioClient.messages.create({
        body: message,
        from: '+18168269845', // US number from Three2Go service
        to: formattedPhone,
      });

      this.logger.log(`Booking confirmation SMS sent to ${formattedPhone}`);

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error) {
      this.logger.error(`Failed to send booking confirmation SMS:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send a general notification SMS
   */
  async sendNotificationSms(
    phoneNumber: string,
    message: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.twilioClient) {
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const result = await this.twilioClient.messages.create({
        body: message,
        from: '+18168269845', // US number from Three2Go service
        to: formattedPhone,
      });

      this.logger.log(`Notification SMS sent to ${formattedPhone}`);

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error) {
      this.logger.error(`Failed to send notification SMS:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Format phone number to E.164 format (e.g., +84123456789)
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // If number starts with 0 (Vietnamese format), replace with country code
    if (cleaned.startsWith('0')) {
      cleaned = '84' + cleaned.substring(1);
    }

    // Add + prefix if not present
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }
}
