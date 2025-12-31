import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { firstValueFrom } from 'rxjs';
import * as path from 'path';
import { BaseResponse } from '@app/shared';
import { TripDto, RouteDto, SeatDto, TripStopDetailDto } from '@app/shared/dto';

export interface ETicketData {
  ticketCode: string;
  passengerName: string;
  email: string;
  phoneNumber: string;
  tripName: string;
  busPlate: string;
  busType: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  seatNumber: string;
  price: string;
  bookingDate: string;
}

export interface FullETicketData {
  bookingCode: string;
  passengerName: string;
  passengerId: string;
  email: string;
  phone: string;
  tripFrom: string;
  tripTo: string;
  fromTerminal: string;
  toTerminal: string;
  departureTime: string;
  arrivalTime: string;
  travelDate: string;
  duration: string;
  seatNumber: string;
  busType: string;
  licensePlate: string;
  ticketPrice: number;
  totalPrice: number;
  bookingDate: string;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
}

@Injectable()
export class ETicketService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('TRIP_SERVICE') private readonly tripClient: ClientProxy,
  ) {}

  async getFullBookingData(
    ticketCode: string,
  ): Promise<{ message: string; data: FullETicketData }> {
    const booking = await this.prisma.bookings.findUnique({
      where: { ticketCode },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const tripRes = await firstValueFrom(
      this.tripClient.send<BaseResponse<TripDto>>(
        { cmd: 'get_trip_detail' },
        { id: booking.tripId, includeRoutes: false },
      ),
    );
    const trip = tripRes?.data;
    if (!trip) throw new NotFoundException('Trip not found');

    const routeRes = await firstValueFrom(
      this.tripClient.send<BaseResponse<RouteDto>>(
        { cmd: 'find_one_route' },
        booking.routeId,
      ),
    );
    const route = routeRes?.data;
    if (!route) throw new NotFoundException('Route not found');

    const pickupStop =
      trip.tripStops?.find(
        (s: TripStopDetailDto) => s.id === booking.pickupStopId,
      ) ?? null;
    const dropoffStop =
      trip.tripStops?.find(
        (s: TripStopDetailDto) => s.id === booking.dropoffStopId,
      ) ?? null;

    const seatRes = await firstValueFrom(
      this.tripClient.send<BaseResponse<SeatDto>>(
        { cmd: 'find_one_seat' },
        booking.seatId,
      ),
    );
    const seat = seatRes?.data;
    if (!seat) throw new NotFoundException('Seat not found');

    const customerInfo = booking.customerInfo as {
      fullName: string;
      email: string;
      phoneNumber: string;
      identificationCard?: string;
    };

    const startTime = new Date(trip.startTime);
    const endTime = new Date(trip.endTime);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    const durationMinutes = Math.floor(
      (durationMs % (1000 * 60 * 60)) / (1000 * 60),
    );
    const duration =
      durationHours > 0
        ? `${durationHours}h ${durationMinutes}m`
        : `${durationMinutes}m`;

    const formatTime = (date: Date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    };

    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    const mapStatus = (
      status: string,
    ): 'CONFIRMED' | 'PENDING' | 'CANCELLED' => {
      switch (status) {
        case 'confirmed':
          return 'CONFIRMED';
        case 'cancelled':
          return 'CANCELLED';
        case 'pendingPayment':
        default:
          return 'PENDING';
      }
    };

    const ticketPrice = Number(booking.price);
    const insuranceFee = 0;
    const serviceFee = 0;
    const totalPrice = ticketPrice + insuranceFee + serviceFee;

    return {
      message: 'Fetched e-ticket data successfully',
      data: {
        bookingCode: booking.ticketCode || '',
        passengerName: customerInfo.fullName,
        passengerId: customerInfo.identificationCard || 'N/A',
        email: customerInfo.email,
        phone: customerInfo.phoneNumber,
        tripFrom: route.origin.city,
        tripTo: route.destination.city,
        fromTerminal: pickupStop?.location?.name || route.origin.name,
        toTerminal: dropoffStop?.location?.name || route.destination.name,
        departureTime: formatTime(startTime),
        arrivalTime: formatTime(endTime),
        travelDate: formatDate(startTime),
        duration,
        seatNumber: seat?.seatNumber || 'N/A',
        busType: trip.bus?.busType || 'Standard',
        licensePlate: trip.bus?.plate || 'N/A',
        ticketPrice,
        totalPrice,
        bookingDate: formatDate(booking.createdAt),
        status: mapStatus(booking.status),
      },
    };
  }

  async getBookingData(ticketCode: string): Promise<ETicketData> {
    const booking = await this.prisma.bookings.findUnique({
      where: { ticketCode },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const tripRes = await firstValueFrom(
      this.tripClient.send<BaseResponse<TripDto>>(
        { cmd: 'get_trip_detail' },
        { id: booking.tripId, includeRoutes: false },
      ),
    );
    const trip = tripRes?.data;
    if (!trip) throw new NotFoundException('Trip not found');

    const routeRes = await firstValueFrom(
      this.tripClient.send<BaseResponse<RouteDto>>(
        { cmd: 'find_one_route' },
        booking.routeId,
      ),
    );
    const route = routeRes?.data;
    if (!route) throw new NotFoundException('Route not found');

    const seatRes = await firstValueFrom(
      this.tripClient.send<BaseResponse<SeatDto>>(
        { cmd: 'find_one_seat' },
        booking.seatId,
      ),
    );
    const seat = seatRes?.data ?? null;

    const pickupStop =
      trip.tripStops?.find(
        (s: TripStopDetailDto) => s.id === booking.pickupStopId,
      ) ?? null;
    const dropoffStop =
      trip.tripStops?.find(
        (s: TripStopDetailDto) => s.id === booking.dropoffStopId,
      ) ?? null;

    const customerInfo = booking.customerInfo as {
      fullName: string;
      email: string;
      phoneNumber: string;
    };

    const formatDateTime = (date: Date) => {
      const d = new Date(date);
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${minutes} - ${day}/${month}/${year}`;
    };

    const formatBookingDate = (date: Date) => {
      const d = new Date(date);
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    return {
      ticketCode: booking.ticketCode || '',
      passengerName: customerInfo.fullName,
      email: customerInfo.email,
      phoneNumber: customerInfo.phoneNumber,
      tripName: trip.tripName || 'Bus Trip',
      busPlate: trip.bus?.plate || 'N/A',
      busType: trip.bus?.busType || 'Standard',
      from: pickupStop?.location?.name || route.origin.name,
      to: dropoffStop?.location?.name || route.destination.name,
      departureTime: formatDateTime(trip.startTime),
      arrivalTime: formatDateTime(trip.endTime),
      seatNumber: seat?.seatNumber || 'N/A',
      price: new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(Number(booking.price)),
      bookingDate: formatBookingDate(booking.createdAt),
    };
  }

  async generateQRCode(data: string): Promise<string> {
    return QRCode.toDataURL(data, {
      width: 150,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  }

  async generatePDF(ticketCode: string): Promise<Buffer> {
    const { data } = await this.getFullBookingData(ticketCode);
    const qrCodeDataUrl = await this.generateQRCode(
      JSON.stringify({
        ticketCode: data.bookingCode,
        passenger: data.passengerName,
        seat: data.seatNumber,
        departure: data.departureTime,
      }),
    );

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
      });

      const chunks: Buffer[] = [];

      const fontPath = path.join(
        process.cwd(),
        'dist',
        'apps',
        'booking',
        'assets',
        'Roboto-Regular.ttf',
      );
      try {
        doc.registerFont('Vietnamese', fontPath);
      } catch (err) {
        console.warn('Load font failed', err);
      }

      // PDFKit chunk type is compatible with Buffer
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;

      // ========== HEADER ==========
      // Pink gradient header background
      doc.rect(0, 0, pageWidth, 100).fill('#fecdd3');
      doc.rect(0, 30, pageWidth, 40).fill('#fda4af');

      // Brand text
      doc.fillColor('#1f2937').fontSize(22).font('Helvetica-Bold');
      doc.text('Bus Ticket Booking', margin, 30);
      doc.fillColor('#4b5563').fontSize(11).font('Helvetica');
      doc.text('E-Ticket Confirmation', margin, 55);

      // CONFIRMED badge
      doc.roundedRect(pageWidth - margin - 100, 35, 90, 28, 14).fill('#dcfce7');
      doc.fillColor('#166534').fontSize(11).font('Helvetica-Bold');
      doc.text('CONFIRMED', pageWidth - margin - 95, 42);

      // ========== BOOKING CODE SECTION ==========
      // Light pink background
      doc.rect(0, 100, pageWidth, 70).fill('#fff1f2');

      doc.fillColor('#6b7280').fontSize(11).font('Helvetica');
      doc.text('Booking Code', margin, 115);

      doc.fillColor('#fb7185').fontSize(26).font('Helvetica-Bold');
      doc.text(data.bookingCode, margin, 135);

      // Dashed separator
      doc.strokeColor('#d1d5db').lineWidth(2);
      doc
        .moveTo(margin, 175)
        .lineTo(pageWidth - margin, 175)
        .dash(8, { space: 4 })
        .stroke();
      doc.undash();

      // ========== TRIP INFORMATION SECTION ==========
      let y = 190;

      // Section title
      doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold');
      doc.text('Trip Information', margin, y);
      y += 25;

      // Route display (FROM → TO)
      doc.fillColor('#111827').fontSize(20).font('Helvetica-Bold');
      doc.text(data.tripFrom, margin, y);

      // Arrow
      doc.fillColor('#9ca3af').fontSize(18);
      doc.text('→', margin + 120, y);

      // Destination
      doc.fillColor('#111827').fontSize(20).font('Helvetica-Bold');
      doc.text(data.tripTo, margin + 150, y);
      y += 25;

      // Departure time
      doc.fillColor('#fb7185').fontSize(16).font('Helvetica-Bold');
      doc.text(data.departureTime, margin, y);

      // Arrival time
      doc.fillColor('#6b7280').fontSize(12).font('Helvetica');
      doc.text(`→ ${data.arrivalTime}`, margin + 100, y + 2);
      y += 30;

      // Trip Info Grid (grey background)
      doc.roundedRect(margin, y, contentWidth, 70, 8).fill('#f9fafb');
      const gridY = y + 12;
      const col1 = margin + 15;
      const col2 = margin + contentWidth / 3 + 10;
      const col3 = margin + (contentWidth * 2) / 3 + 5;

      // Travel Date
      doc.fillColor('#6b7280').fontSize(9).font('Helvetica');
      doc.text('Travel Date', col1, gridY);
      doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold');
      doc.text(data.travelDate, col1, gridY + 14);

      // Seat Number
      doc.fillColor('#6b7280').fontSize(9).font('Helvetica');
      doc.text('Seat Number', col2, gridY);
      doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold');
      doc.text(data.seatNumber, col2, gridY + 14);

      // Bus Type
      doc.fillColor('#6b7280').fontSize(9).font('Helvetica');
      doc.text('Bus Type', col3, gridY);
      doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold');
      doc.text(data.busType, col3, gridY + 14);

      // Duration
      doc.fillColor('#6b7280').fontSize(9).font('Helvetica');
      doc.text('Duration', col1, gridY + 35);
      doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold');
      doc.text(data.duration, col1, gridY + 49);

      y += 85;

      // License Plate (yellow badge)
      doc.roundedRect(margin, y, 180, 30, 6).fill('#fef9c3');
      doc.fillColor('#854d0e').fontSize(11).font('Helvetica-Bold');
      doc.text(`License Plate: ${data.licensePlate}`, margin + 12, y + 9);
      y += 45;

      // ========== PASSENGER INFORMATION SECTION ==========
      doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold');
      doc.text('Passenger Information', margin, y);
      y += 25;

      // Full Name
      doc.fillColor('#6b7280').fontSize(10).font('Helvetica');
      doc.text('Full Name', margin, y);
      doc.fillColor('#111827').fontSize(12).font('Vietnamese');
      doc.text(data.passengerName, margin, y + 14);
      y += 38;

      // Email & Phone (side by side)
      doc.fillColor('#6b7280').fontSize(10).font('Helvetica');
      doc.text('Email', margin, y);
      doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold');
      doc.text(data.email, margin, y + 14);

      doc.fillColor('#6b7280').fontSize(10).font('Helvetica');
      doc.text('Phone', margin + contentWidth / 2, y);
      doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold');
      doc.text(data.phone, margin + contentWidth / 2, y + 14);
      y += 45;

      // ========== PAYMENT DETAILS SECTION ==========
      doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold');
      doc.text('Payment Details', margin, y);
      y += 20;

      // Payment box
      doc.roundedRect(margin, y, contentWidth, 70, 8).fill('#f9fafb');
      const payY = y + 15;

      // Ticket Price
      doc.fillColor('#4b5563').fontSize(11).font('Helvetica');
      doc.text(`Ticket Price (Seat ${data.seatNumber})`, margin + 15, payY);
      doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold');
      const priceStr = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(data.ticketPrice);
      doc.text(priceStr, pageWidth - margin - 120, payY);

      // Divider
      doc.strokeColor('#d1d5db').lineWidth(1);
      doc
        .moveTo(margin + 15, payY + 25)
        .lineTo(pageWidth - margin - 15, payY + 25)
        .stroke();

      // Total
      doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold');
      doc.text('Total Paid', margin + 15, payY + 35);
      doc.fillColor('#16a34a').fontSize(14).font('Helvetica-Bold');
      const totalStr = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(data.totalPrice);
      doc.text(totalStr, pageWidth - margin - 120, payY + 33);
      y += 85;

      // ========== QR CODE SECTION ==========
      doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold');
      doc.text('Scan QR Code', margin, y);
      y += 10;

      // QR Code
      const qrImageData = qrCodeDataUrl.split(',')[1];
      const qrBuffer = Buffer.from(qrImageData, 'base64');
      doc.image(qrBuffer, margin, y, { width: 100, height: 100 });

      // QR Code instruction
      doc.fillColor('#6b7280').fontSize(9).font('Helvetica');
      doc.text(
        'Scan this QR code for quick verification',
        margin + 110,
        y + 40,
        { width: 150 },
      );

      y += 115;

      // ========== IMPORTANT INFORMATION SECTION ==========
      doc.roundedRect(margin, y, contentWidth, 90, 8).fill('#eff6ff');

      doc.fillColor('#1e40af').fontSize(11).font('Helvetica-Bold');
      doc.text('Important Information', margin + 15, y + 12);

      doc.fillColor('#1e40af').fontSize(9).font('Helvetica');
      const bulletY = y + 30;
      doc.text(
        '• Please arrive at the terminal at least 15 minutes before departure',
        margin + 15,
        bulletY,
      );
      doc.text(
        '• Bring a valid ID matching the passenger name on this ticket',
        margin + 15,
        bulletY + 14,
      );
      doc.text(
        '• Present this e-ticket (printed or digital) for boarding',
        margin + 15,
        bulletY + 28,
      );
      doc.text(
        '• Keep your booking code safe for any inquiries',
        margin + 15,
        bulletY + 42,
      );

      // ========== FOOTER ==========
      const footerY = doc.page.height - 50;
      doc.rect(0, footerY, pageWidth, 50).fill('#f3f4f6');

      doc.fillColor('#6b7280').fontSize(10).font('Helvetica');
      doc.text(
        'Thank you for choosing Bus Ticket Booking Service',
        margin,
        footerY + 12,
        { align: 'center', width: contentWidth },
      );
      doc.fillColor('#9ca3af').fontSize(8);
      doc.text(
        'For support: support@busticket.com | Hotline: 1900-xxxx',
        margin,
        footerY + 28,
        { align: 'center', width: contentWidth },
      );

      doc.end();
    });
  }
}
