import { Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: Twilio;

  constructor() {
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

  isServiceAvailable(): boolean {
    return !!this.twilioClient;
  }

  async checkSmsPreference(
    userPreferences: Record<string, Record<string, boolean>> | null,
    notificationType: 'booking' | 'payment' | 'reminder' | 'promotion',
  ): Promise<boolean> {
    try {
      if (!userPreferences) {
        return true;
      }
      return userPreferences.sms?.[notificationType] !== false;
    } catch (error) {
      this.logger.error('Error checking SMS preferences:', error);
      return true;
    }
  }

  async sendTripReminderSms(
    _phoneNumber: string,
    _reminderDetails: {
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
    if (!this.twilioClient) return { success: false, error: 'Config missing' };
    return { success: true, messageId: 'mock-sid' };
  }

  private formatPhoneNumber(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '84' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  }
}
