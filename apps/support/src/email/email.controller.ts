import { BadRequestException, Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EmailService } from './email.service';

type UserCreatedPayload = {
  email: string;
  verifyToken: string;
};

type PasswordResetPayload = {
  email: string;
  resetToken: string;
};

type ETicketPayload = {
  email: string;
  ticketCode: string;
  passengerName: string;
  tripDetails: {
    from: string;
    to: string;
    departureTime: string;
    seatNumber: string;
    busType?: string;
    licensePlate?: string;
    travelDate?: string;
    totalPrice?: string;
  };
  /**
   * E-ticket PDF, base64 encoded.
   * (Microservice payloads are typically JSON-serialized; Buffer is not safe to send directly.)
   */
  pdfBase64: string;
};

type TripReminderPayload = {
  email: string;
  reminderDetails: {
    customerName: string;
    ticketCode: string;
    tripDate: string;
    tripTime: string;
    origin: string;
    destination: string;
    pickupLocation: string;
    pickupAddress: string;
    seatNumber: string;
    busPlate: string;
    hoursUntilTrip: number;
  };
};

type RefundNotificationPayload = {
  email: string;
  customerName: string;
  refundDetails: {
    ticketCode: string;
    tripName: string;
    refundAmount: number;
    refundPercent: number;
    feeAmount: number;
  };
};

function assertString(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
}

function assertNumber(value: unknown, field: string) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new BadRequestException(`${field} must be a number`);
  }
}

@Controller()
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  /**
   * Verify email after user registration.
   * Publisher example (Event): identity -> emit('user_created', { email, verifyToken })
   */
  @EventPattern('user_created')
  async handleUserCreated(@Payload() data: UserCreatedPayload) {
    assertString(data?.email, 'email');
    assertString(data?.verifyToken, 'verifyToken');
    await this.emailService.sendVerificationEmail(data.email, data.verifyToken);
  }

  /**
   * Password reset email.
   * Publisher example (Event): identity -> emit('password_reset_requested', { email, resetToken })
   */
  @EventPattern('password_reset_requested')
  async handlePasswordResetRequested(@Payload() data: PasswordResetPayload) {
    assertString(data?.email, 'email');
    assertString(data?.resetToken, 'resetToken');
    await this.emailService.sendPasswordResetEmail(data.email, data.resetToken);
  }

  /**
   * Send PDF e-ticket after successful booking/payment.
   * Publisher example (Event): booking/payment -> emit('eticket_ready', payload)
   */
  @EventPattern('eticket_ready')
  async handleETicketReady(@Payload() data: ETicketPayload) {
    assertString(data?.email, 'email');
    assertString(data?.ticketCode, 'ticketCode');
    assertString(data?.passengerName, 'passengerName');

    if (!data?.tripDetails) {
      throw new BadRequestException('tripDetails is required');
    }
    assertString(data.tripDetails.from, 'tripDetails.from');
    assertString(data.tripDetails.to, 'tripDetails.to');
    assertString(data.tripDetails.departureTime, 'tripDetails.departureTime');
    assertString(data.tripDetails.seatNumber, 'tripDetails.seatNumber');

    assertString(data?.pdfBase64, 'pdfBase64');
    const pdfBuffer = Buffer.from(data.pdfBase64, 'base64');
    if (!pdfBuffer.length) {
      throw new BadRequestException('pdfBase64 is invalid (empty buffer)');
    }

    await this.emailService.sendETicketEmail(
      data.email,
      data.ticketCode,
      data.passengerName,
      data.tripDetails,
      pdfBuffer,
    );
  }

  /**
   * Trip reminder email.
   * Publisher example (Event): system/cron -> emit('trip_reminder', { email, reminderDetails })
   */
  @EventPattern('trip_reminder')
  async handleTripReminder(@Payload() data: TripReminderPayload) {
    assertString(data?.email, 'email');
    if (!data?.reminderDetails) {
      throw new BadRequestException('reminderDetails is required');
    }
    const d = data.reminderDetails;
    assertString(d.customerName, 'reminderDetails.customerName');
    assertString(d.ticketCode, 'reminderDetails.ticketCode');
    assertString(d.tripDate, 'reminderDetails.tripDate');
    assertString(d.tripTime, 'reminderDetails.tripTime');
    assertString(d.origin, 'reminderDetails.origin');
    assertString(d.destination, 'reminderDetails.destination');
    assertString(d.pickupLocation, 'reminderDetails.pickupLocation');
    assertString(d.pickupAddress, 'reminderDetails.pickupAddress');
    assertString(d.seatNumber, 'reminderDetails.seatNumber');
    assertString(d.busPlate, 'reminderDetails.busPlate');
    assertNumber(d.hoursUntilTrip, 'reminderDetails.hoursUntilTrip');

    await this.emailService.sendTripReminderEmail(
      data.email,
      data.reminderDetails,
    );
  }

  /**
   * Refund processed notification.
   * Publisher example (Event): booking/payment -> emit('refund_processed', { email, customerName, refundDetails })
   */
  @EventPattern('refund_processed')
  async handleRefundProcessed(@Payload() data: RefundNotificationPayload) {
    assertString(data?.email, 'email');
    assertString(data?.customerName, 'customerName');
    if (!data?.refundDetails) {
      throw new BadRequestException('refundDetails is required');
    }
    const d = data.refundDetails;
    assertString(d.ticketCode, 'refundDetails.ticketCode');
    assertString(d.tripName, 'refundDetails.tripName');
    assertNumber(d.refundAmount, 'refundDetails.refundAmount');
    assertNumber(d.refundPercent, 'refundDetails.refundPercent');
    assertNumber(d.feeAmount, 'refundDetails.feeAmount');

    await this.emailService.sendRefundNotification(
      data.email,
      data.customerName,
      data.refundDetails,
    );
  }
}
