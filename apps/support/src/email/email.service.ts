import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${process.env.FRONTEND_URL}/email-verified?token=${token}`;

    console.log('Sending verification email to:', email);
    console.log('Token:', token);
    console.log('Verification URL:', verificationUrl);

    const mailOptions = {
      from: `"Bus Ticket Booking" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%);
              border-radius: 16px;
              padding: 40px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .logo {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo h1 {
              color: #134074;
              font-size: 28px;
              margin: 0;
            }
            .content {
              background: white;
              border-radius: 12px;
              padding: 30px;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              padding: 14px 40px;
              background-color: #134074;
              color: white !important;
              text-decoration: none;
              border-radius: 12px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .button:hover {
              background-color: #0B2545;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 20px;
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 12px;
              margin: 20px 0;
              border-radius: 4px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <h1>🚌 Bus Ticket Booking</h1>
            </div>
            
            <div class="content">
              <h2 style="color: #134074; margin-top: 0;">Welcome! Verify Your Email</h2>
              
              <p>Thank you for signing up! Please verify your email address to activate your account.</p>
              
              <p>Click the button below to verify your email:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #134074; font-size: 12px;">${verificationUrl}</p>
              
              <div class="warning">
                ⚠️ This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
              </div>
            </div>
            
            <div class="footer">
              <p>© 2025 Bus Ticket Booking. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"Bus Ticket Booking" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%);
              border-radius: 16px;
              padding: 40px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .content {
              background: white;
              border-radius: 12px;
              padding: 30px;
            }
            .button {
              display: inline-block;
              padding: 14px 40px;
              background-color: #134074;
              color: white !important;
              text-decoration: none;
              border-radius: 12px;
              font-weight: bold;
              margin: 20px 0;
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 12px;
              margin: 20px 0;
              border-radius: 4px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <h2 style="color: #134074;">Reset Your Password</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <div class="warning">
                ⚠️ This link will expire in 1 hour. If you didn't request this, please ignore this email.
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  async sendETicketEmail(
    email: string,
    ticketCode: string,
    passengerName: string,
    tripDetails: {
      from: string;
      to: string;
      departureTime: string;
      seatNumber: string;
      busType?: string;
      licensePlate?: string;
      travelDate?: string;
      totalPrice?: string;
    },
    pdfBuffer: Buffer,
  ) {
    const mailOptions = {
      from: `"Bus Ticket Booking" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `E-Ticket Confirmation - ${ticketCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 20px;
              background-color: #f8f9fa;
            }
            .ticket-container {
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
              border: 2px solid #e5e7eb;
            }
            .header {
              background: linear-gradient(135deg, #fecdd3 0%, #fda4af 50%, #fecdd3 100%);
              padding: 24px 32px;
            }
            .header-content {
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .brand {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .brand-icon {
              background: white;
              padding: 12px;
              border-radius: 12px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            .brand-text h1 {
              color: #1f2937;
              font-size: 22px;
              margin: 0;
              font-weight: 700;
            }
            .brand-text p {
              color: #4b5563;
              font-size: 13px;
              margin: 4px 0 0 0;
            }
            .status-badge {
              background: #dcfce7;
              color: #166534;
              padding: 8px 16px;
              border-radius: 20px;
              font-weight: 600;
              font-size: 13px;
              border: 2px solid #86efac;
            }
            .booking-code-section {
              background: linear-gradient(to bottom, #fff1f2, #ffffff);
              padding: 24px 32px;
              border-bottom: 4px dashed #d1d5db;
            }
            .booking-label {
              font-size: 13px;
              color: #6b7280;
              margin-bottom: 4px;
            }
            .booking-code {
              font-size: 28px;
              font-weight: 700;
              color: #fb7185;
              font-family: 'Courier New', monospace;
              letter-spacing: 2px;
            }
            .section {
              padding: 24px 32px;
              border-bottom: 1px solid #e5e7eb;
            }
            .section-title {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 16px;
            }
            .section-title-icon {
              width: 20px;
              height: 20px;
              color: #fb7185;
            }
            .section-title h2 {
              font-size: 18px;
              font-weight: 700;
              color: #111827;
              margin: 0;
            }
            .route-display {
              display: table;
              width: 100%;
              margin-bottom: 20px;
            }
            .route-point {
              display: table-cell;
              width: 40%;
            }
            .route-point.end {
              text-align: right;
            }
            .route-middle {
              display: table-cell;
              width: 20%;
              text-align: center;
              vertical-align: middle;
            }
            .city-name {
              font-size: 24px;
              font-weight: 700;
              color: #111827;
              margin-bottom: 4px;
            }
            .time {
              font-size: 18px;
              font-weight: 600;
              color: #fb7185;
            }
            .route-line {
              position: relative;
              height: 2px;
              background: #d1d5db;
              margin: 0 10px;
            }
            .trip-info-grid {
              background: #f9fafb;
              border-radius: 12px;
              padding: 16px;
            }
            .trip-info-row {
              display: table;
              width: 100%;
              margin-bottom: 8px;
            }
            .trip-info-row:last-child {
              margin-bottom: 0;
            }
            .trip-info-item {
              display: table-cell;
              width: 33.33%;
              padding: 8px;
            }
            .trip-info-label {
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 4px;
            }
            .trip-info-value {
              font-size: 14px;
              font-weight: 600;
              color: #111827;
            }
            .license-plate {
              background: #fef9c3;
              color: #854d0e;
              padding: 8px 16px;
              border-radius: 8px;
              font-weight: 600;
              font-size: 14px;
              text-align: center;
              margin-top: 16px;
            }
            .passenger-grid {
              display: table;
              width: 100%;
            }
            .passenger-col {
              display: table-cell;
              width: 50%;
              vertical-align: top;
            }
            .info-item {
              margin-bottom: 16px;
            }
            .info-item:last-child {
              margin-bottom: 0;
            }
            .info-label {
              font-size: 13px;
              color: #6b7280;
              margin-bottom: 4px;
            }
            .info-value {
              font-size: 15px;
              font-weight: 600;
              color: #111827;
            }
            .payment-box {
              background: #f9fafb;
              border-radius: 12px;
              padding: 16px;
            }
            .payment-row {
              display: table;
              width: 100%;
              padding: 8px 0;
            }
            .payment-label {
              display: table-cell;
              color: #4b5563;
              font-size: 14px;
            }
            .payment-value {
              display: table-cell;
              text-align: right;
              font-weight: 600;
              font-size: 14px;
            }
            .payment-total {
              border-top: 2px solid #d1d5db;
              padding-top: 12px;
              margin-top: 8px;
            }
            .payment-total .payment-label {
              font-size: 16px;
              font-weight: 700;
              color: #111827;
            }
            .payment-total .payment-value {
              font-size: 16px;
              font-weight: 700;
              color: #16a34a;
            }
            .important-info {
              background: #eff6ff;
              padding: 24px 32px;
            }
            .important-info h3 {
              color: #1e40af;
              font-size: 15px;
              font-weight: 600;
              margin: 0 0 12px 0;
            }
            .important-info ul {
              margin: 0;
              padding-left: 20px;
              color: #1e40af;
              font-size: 13px;
            }
            .important-info li {
              margin-bottom: 6px;
            }
            .footer {
              background: #f3f4f6;
              padding: 20px 32px;
              text-align: center;
              border-top: 1px solid #e5e7eb;
            }
            .footer p {
              margin: 0;
              color: #6b7280;
              font-size: 13px;
            }
            .footer .support {
              margin-top: 8px;
              font-size: 12px;
              color: #9ca3af;
            }
          </style>
        </head>
        <body>
          <div class="ticket-container">
            <!-- Header -->
            <div class="header">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div class="brand-text">
                      <h1>Bus Ticket Booking</h1>
                      <p>E-Ticket Confirmation</p>
                    </div>
                  </td>
                  <td align="right">
                    <span class="status-badge">CONFIRMED</span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Booking Code -->
            <div class="booking-code-section">
              <p class="booking-label">Booking Code</p>
              <p class="booking-code">${ticketCode}</p>
            </div>

            <!-- Trip Information -->
            <div class="section">
              <div class="section-title">
                <h2>Trip Information</h2>
              </div>

              <!-- Route Display -->
              <div class="route-display">
                <div class="route-point">
                  <p class="city-name">${tripDetails.from}</p>
                  <p class="time">${tripDetails.departureTime}</p>
                </div>
                <div class="route-middle">
                  <span style="color: #9ca3af; font-size: 20px;">&#8594;</span>
                </div>
                <div class="route-point end">
                  <p class="city-name">${tripDetails.to}</p>
                </div>
              </div>

              <!-- Trip Info Grid -->
              <div class="trip-info-grid">
                <div class="trip-info-row">
                  <div class="trip-info-item">
                    <p class="trip-info-label">Travel Date</p>
                    <p class="trip-info-value">${tripDetails.travelDate || 'See ticket'}</p>
                  </div>
                  <div class="trip-info-item">
                    <p class="trip-info-label">Seat Number</p>
                    <p class="trip-info-value">${tripDetails.seatNumber}</p>
                  </div>
                  <div class="trip-info-item">
                    <p class="trip-info-label">Bus Type</p>
                    <p class="trip-info-value">${tripDetails.busType || 'Standard'}</p>
                  </div>
                </div>
              </div>

              ${tripDetails.licensePlate ? `<div class="license-plate">License Plate: ${tripDetails.licensePlate}</div>` : ''}
            </div>

            <!-- Passenger Information -->
            <div class="section">
              <div class="section-title">
                <h2>Passenger Information</h2>
              </div>
              <div class="info-item">
                <p class="info-label">Full Name</p>
                <p class="info-value">${passengerName}</p>
              </div>
              <div class="info-item">
                <p class="info-label">Email</p>
                <p class="info-value">${email}</p>
              </div>
            </div>

            <!-- Payment Details -->
            ${
              tripDetails.totalPrice
                ? `
            <div class="section">
              <div class="section-title">
                <h2>Payment Details</h2>
              </div>
              <div class="payment-box">
                <div class="payment-row">
                  <span class="payment-label">Ticket Price (Seat ${tripDetails.seatNumber})</span>
                  <span class="payment-value">${tripDetails.totalPrice}</span>
                </div>
                <div class="payment-row payment-total">
                  <span class="payment-label">Total Paid</span>
                  <span class="payment-value">${tripDetails.totalPrice}</span>
                </div>
              </div>
            </div>
            `
                : ''
            }

            <!-- Important Information -->
            <div class="important-info">
              <h3>Important Information</h3>
              <ul>
                <li>Please arrive at the terminal at least 15 minutes before departure</li>
                <li>Bring a valid ID matching the passenger name on this ticket</li>
                <li>Present this e-ticket (printed or digital) for boarding</li>
                <li>Keep your booking code safe for any inquiries</li>
              </ul>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p>Thank you for choosing Bus Ticket Booking Service</p>
              <p class="support">For support: support@busticket.com | Hotline: 1900-xxxx</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `eticket-${ticketCode}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`E-ticket email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending e-ticket email:', error);
      throw error;
    }
  }

  async sendTripReminderEmail(
    email: string,
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
    },
  ) {
    const {
      customerName,
      ticketCode,
      tripDate,
      tripTime,
      origin,
      destination,
      pickupLocation,
      pickupAddress,
      seatNumber,
      busPlate,
      hoursUntilTrip,
    } = reminderDetails;

    const mailOptions = {
      from: `"Bus Ticket Booking" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `🚌 Trip Reminder: ${origin} → ${destination} - Departing Soon!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%);
              border-radius: 16px;
              padding: 40px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #ec4899;
              margin: 0 0 10px 0;
              font-size: 28px;
            }
            .alert-box {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 8px;
            }
            .alert-box h3 {
              margin: 0 0 10px 0;
              color: #856404;
              font-size: 18px;
            }
            .trip-details {
              background: white;
              padding: 20px;
              border-radius: 12px;
              margin: 20px 0;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px solid #f0f0f0;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: bold;
              color: #666;
            }
            .detail-value {
              color: #333;
              text-align: right;
            }
            .highlight {
              background: #fef3c7;
              padding: 2px 8px;
              border-radius: 4px;
              font-weight: bold;
            }
            .route {
              text-align: center;
              font-size: 24px;
              color: #ec4899;
              margin: 20px 0;
              font-weight: bold;
            }
            .checklist {
              background: #f0fdf4;
              padding: 20px;
              border-radius: 12px;
              margin: 20px 0;
            }
            .checklist h3 {
              color: #166534;
              margin: 0 0 15px 0;
            }
            .checklist ul {
              margin: 0;
              padding-left: 20px;
            }
            .checklist li {
              margin: 8px 0;
              color: #166534;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #f0f0f0;
              color: #666;
              font-size: 14px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #ec4899;
              color: white;
              text-decoration: none;
              border-radius: 25px;
              margin: 20px 0;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚌 Trip Reminder</h1>
              <p>Don't forget about your upcoming trip!</p>
            </div>

            <div class="alert-box">
              <h3>⏰ Your trip departs in ${hoursUntilTrip} hours!</h3>
              <p style="margin: 0;">Please arrive at least <strong>30 minutes early</strong> for check-in.</p>
            </div>

            <div class="route">
              ${origin} → ${destination}
            </div>

            <div class="trip-details">
              <h3 style="margin-top: 0; color: #ec4899;">Trip Information</h3>
              
              <div class="detail-row">
                <span class="detail-label">Passenger Name:</span>
                <span class="detail-value">${customerName}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Ticket Code:</span>
                <span class="detail-value highlight">${ticketCode}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Departure Date:</span>
                <span class="detail-value">${tripDate}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Departure Time:</span>
                <span class="detail-value highlight">${tripTime}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Pickup Location:</span>
                <span class="detail-value">${pickupLocation}</span>
              </div>
              
              ${
                pickupAddress
                  ? `
              <div class="detail-row">
                <span class="detail-label">Address:</span>
                <span class="detail-value">${pickupAddress}</span>
              </div>
              `
                  : ''
              }
              
              <div class="detail-row">
                <span class="detail-label">Seat Number:</span>
                <span class="detail-value highlight">${seatNumber}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Bus License Plate:</span>
                <span class="detail-value">${busPlate}</span>
              </div>
            </div>

            <div class="checklist">
              <h3>✓ Pre-Departure Checklist</h3>
              <ul>
                <li>Arrive at pickup location <strong>30 minutes before departure</strong></li>
                <li>Bring your e-ticket (printed or on mobile device)</li>
                <li>Carry a valid ID (passport or national ID card)</li>
                <li>Check weather conditions and dress appropriately</li>
                <li>Bring any necessary medications or personal items</li>
                <li>Save our contact number for emergencies: <strong>1900-xxxx</strong></li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/booking-details/${ticketCode}" class="button">
                View Booking Details
              </a>
            </div>

            <div class="footer">
              <p><strong>Need to make changes?</strong> Contact us or manage your booking online.</p>
              <p>© 2025 Bus Ticket Booking. All rights reserved.</p>
              <p style="font-size: 12px; color: #999;">This is an automated reminder email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(
        `Trip reminder email sent to ${email} for trip departing in ${hoursUntilTrip} hours`,
      );
      return { success: true };
    } catch (error) {
      console.error('Error sending trip reminder email:', error);
      throw error;
    }
  }

  async sendRefundNotification(
    email: string,
    customerName: string,
    refundDetails: {
      ticketCode: string;
      tripName: string;
      refundAmount: number;
      refundPercent: number;
      feeAmount: number;
    },
  ) {
    const { ticketCode, tripName, refundAmount, refundPercent, feeAmount } =
      refundDetails;

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(amount);
    };

    const mailOptions = {
      from: `"Bus Ticket Booking" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Booking Cancelled & Refund Processed - ${ticketCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #ffffff;
              border-radius: 16px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              overflow: hidden;
              border: 1px solid #e5e7eb;
            }
            .header {
              background: linear-gradient(135deg, #134074 0%, #1e56a0 100%);
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              color: white;
              margin: 0;
              font-size: 24px;
            }
            .status-icon {
              font-size: 40px;
              margin-bottom: 10px;
              display: block;
            }
            .content {
              padding: 30px;
            }
            .greeting {
              font-size: 16px;
              margin-bottom: 20px;
            }
            .refund-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 20px;
              margin: 20px 0;
            }
            .refund-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .refund-row:last-child {
              border-bottom: none;
              padding-bottom: 0;
            }
            .refund-total {
              border-top: 2px solid #cbd5e1;
              margin-top: 10px;
              padding-top: 15px;
              font-weight: bold;
              font-size: 18px;
              color: #166534;
            }
            .label {
              color: #64748b;
            }
            .value {
              font-weight: 600;
              color: #0f172a;
            }
            .info-text {
              background: #eff6ff;
              border-left: 4px solid #3b82f6;
              padding: 15px;
              margin-top: 25px;
              border-radius: 4px;
              font-size: 14px;
              color: #1e40af;
            }
            .footer {
              background: #f1f5f9;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="status-icon">✅</span>
              <h1>Refund Processed</h1>
            </div>
            
            <div class="content">
              <p class="greeting">Hi <strong>${customerName}</strong>,</p>
              
              <p>Your booking <strong>${ticketCode}</strong> for trip <strong>${tripName}</strong> has been successfully cancelled as per your request.</p>
              
              <div class="refund-box">
                <div class="refund-row">
                  <span class="label">Ticket Status </span>
                  <span class="value" style="color: #ef4444;">Cancelled</span>
                </div>
                <div class="refund-row">
                  <span class="label">Refund Policy </span>
                  <span class="value">${refundPercent}% of ticket price</span>
                </div>
                <div class="refund-row">
                  <span class="label">Cancellation Fee </span>
                  <span class="value" style="color: #ef4444;">-${formatCurrency(feeAmount)}</span>
                </div>
                <div class="refund-row refund-total">
                  <span class="label">Total Refund Amount</span>
                  <span class="value">${formatCurrency(refundAmount)}</span>
                </div>
              </div>

              <div class="info-text">
                <strong>ℹ️ Note:</strong> The refund amount has been initiated to your original payment method. Please allow <strong>3-5 business days</strong> for the amount to reflect in your account, depending on your bank's processing time.
              </div>

              <p style="margin-top: 30px;">If you have any questions, please contact our support team.</p>
            </div>

            <div class="footer">
              <p>© 2025 Bus Ticket Booking. All rights reserved.</p>
              <p>This is an automated message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Refund email sent to ${email} for booking ${ticketCode}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending refund email:', error);
      throw error;
    }
  }
}
