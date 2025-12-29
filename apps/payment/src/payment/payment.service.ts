import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { PayOSService } from '../payos/payos.service';
import { CreatePaymentDto, PayOSWebhookDto } from '@app/shared/dto';
import { PaymentGateway } from './payment.gateway';
import { Prisma } from '@prisma/client-payment';
import { lastValueFrom } from 'rxjs';
import { BaseResponse } from '@app/shared';
import type {
  BookingDto,
  BookingRouteLiteDto,
  BookingRulesSettingsDto,
  TripDto,
  RouteDto,
  BookingResponseDto,
} from '@app/shared/dto';
import {
  BookingStatus,
  GatewayType,
  PaymentStatus,
  SettingKey,
} from '@app/shared/enums';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payosService: PayOSService,
    private readonly paymentGateway: PaymentGateway,
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
    @Inject('TRIP_SERVICE') private readonly tripClient: ClientProxy,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    @Inject('SUPPORT_SERVICE') private readonly supportClient: ClientProxy,
  ) {}

  private async getBookingOrThrow(id: string) {
    const res = await lastValueFrom(
      this.bookingClient.send<BaseResponse<BookingDto>>(
        { cmd: 'find_one_booking' },
        id,
      ),
    );
    const booking = res?.data;
    if (!booking) throw new NotFoundException('Booking does not exist');
    return booking;
  }

  async createPaymentLink(createPaymentDto: CreatePaymentDto) {
    const {
      bookingId,
      bookingIds,
      totalAmount,
      buyerName,
      buyerEmail,
      buyerPhone,
    } = createPaymentDto;

    // Kiểm tra booking có tồn tại và chưa thanh toán
    const booking = await this.getBookingOrThrow(bookingId);

    if (booking.status === String(BookingStatus.confirmed)) {
      throw new BadRequestException('Booking đã được thanh toán');
    }

    if (booking.status === String(BookingStatus.cancelled)) {
      throw new BadRequestException('Booking đã bị hủy');
    }

    // Tạo orderCode duy nhất từ bookingId
    const orderCode = this.generateOrderCode(bookingId);

    // Handle multiple bookings
    const allBookingIds = bookingIds?.length ? bookingIds : [bookingId];

    // Calculate total amount from all bookings if not provided
    let amount: number;
    let seatNumbers: string[] = [booking?.seat?.seatNumber ?? 'N/A'];

    if (totalAmount) {
      amount = totalAmount;
    } else if (allBookingIds.length > 1) {
      // Fetch all bookings to calculate total
      const allBookings = await Promise.all(
        allBookingIds.map((id) => this.getBookingOrThrow(id)),
      );
      amount = allBookings.reduce((sum, b) => sum + Number(b.price ?? 0), 0);
      seatNumbers = allBookings.map((b) => b?.seat?.seatNumber ?? 'N/A');
    } else {
      amount = Number(booking.price);
    }

    // Lấy thông tin khách hàng
    const customerInfo = booking.customerInfo as unknown as Record<
      string,
      string | undefined
    >;
    const finalBuyerName =
      buyerName ||
      customerInfo?.fullName ||
      booking.user?.fullName ||
      'Khách hàng';

    const finalBuyerEmail =
      buyerEmail || customerInfo?.email || booking.user?.email || '';

    const finalBuyerPhone =
      buyerPhone ||
      customerInfo?.phoneNumber ||
      booking.user?.phoneNumber ||
      '';

    // Tạo mô tả thanh toán (PayOS giới hạn 25 ký tự)
    const seatDesc =
      seatNumbers.length > 1
        ? `${seatNumbers.length} ghe`
        : `ghe ${seatNumbers[0]}`;
    const description = `Ve xe ${seatDesc}`.substring(0, 25);

    // Tạo payment record với metadata chứa tất cả booking IDs
    const payment = await this.prisma.payments.create({
      data: {
        bookingId: booking.id,
        amount: new Prisma.Decimal(amount),
        gateway: GatewayType.payos,
        orderCode: BigInt(orderCode),
        status: PaymentStatus.pending,
        metadata:
          allBookingIds.length > 1
            ? { relatedBookingIds: allBookingIds }
            : undefined,
      },
    });

    try {
      // Tạo payment link với PayOS
      const paymentLink = await this.payosService.createPaymentLink({
        orderCode,
        amount,
        description,
        buyerName: finalBuyerName,
        buyerEmail: finalBuyerEmail,
        buyerPhone: finalBuyerPhone,
        items: [
          {
            name: description,
            quantity: 1,
            price: amount,
          },
        ],
      });

      // Log response để debug
      this.logger.log('PayOS Response:', JSON.stringify(paymentLink, null, 2));

      // Cập nhật payment với paymentLinkId
      const linkData = paymentLink as {
        paymentLinkId?: string;
        id?: string;
        checkoutUrl?: string;
        checkout_url?: string;
        qrCode?: string;
        qr_code?: string;
        orderCode?: number;
        order_code?: number;
        amount?: number;
      };

      await this.prisma.payments.update({
        where: { id: payment.id },
        data: {
          gatewayTransactionId:
            linkData.paymentLinkId || linkData.id || 'unknown',
        },
      });

      this.logger.log(
        `Payment link created for booking ${bookingId}: ${linkData.checkoutUrl || linkData.checkout_url}`,
      );

      return {
        paymentId: payment.id,
        checkoutUrl: linkData.checkoutUrl || linkData.checkout_url || '',
        qrCode: linkData.qrCode || linkData.qr_code,
        orderCode: linkData.orderCode || linkData.order_code || orderCode,
        amount: linkData.amount || amount,
      };
    } catch (error) {
      // Nếu tạo payment link thất bại, cập nhật payment status
      await this.prisma.payments.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.failed },
      });

      throw error;
    }
  }

  /**
   * Xử lý webhook từ PayOS
   * PayOS sends: { code: "00", desc: "success", data: { orderCode, amount, ... }, signature: "..." }
   */
  async handlePayOSWebhook(webhookData: PayOSWebhookDto) {
    try {
      this.logger.log(
        `Received PayOS webhook: ${JSON.stringify(webhookData, null, 2)}`,
      );

      // Extract data from nested structure
      const webhookCode = webhookData.code;
      const paymentData = webhookData.data;

      if (!paymentData || !paymentData.orderCode) {
        this.logger.error('Invalid webhook data: missing orderCode');
        throw new BadRequestException('Invalid webhook data');
      }

      this.logger.log(
        `Processing webhook for orderCode: ${paymentData.orderCode}, webhookCode: ${webhookCode}`,
      );

      // Tìm booking từ orderCode
      const bookingId = await this.getBookingIdFromOrderCode(
        paymentData.orderCode,
      );

      const payment = await this.prisma.payments.findUnique({
        where: {
          orderCode: BigInt(paymentData.orderCode),
        } as unknown as Prisma.PaymentsWhereUniqueInput,
      });
      if (!payment) {
        this.logger.error(`Payment not found for booking: ${bookingId}`);
        throw new NotFoundException('Payment không tồn tại');
      }

      // Skip if already processed
      if (payment.status === String(PaymentStatus.successful)) {
        this.logger.log(`Payment already processed for booking: ${bookingId}`);
        return {
          success: true,
          message: 'Payment already processed',
          bookingId,
          status: 'successful',
        };
      }

      // Kiểm tra trạng thái thanh toán - code "00" means success
      const isSuccess = webhookCode === '00';

      if (isSuccess) {
        // Get all related booking IDs from payment metadata
        const metadata = payment.metadata as { relatedBookingIds?: string[] };
        const allBookingIds = metadata?.relatedBookingIds || [bookingId];

        this.logger.log(
          `Processing payment for ${allBookingIds.length} booking(s): ${allBookingIds.join(', ')}`,
        );

        // Thanh toán thành công - confirm all related bookings
        await this.prisma.payments.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.successful,
            gatewayTransactionId: paymentData.paymentLinkId,
          },
        });

        await lastValueFrom(
          this.bookingClient.send<BaseResponse<unknown>>(
            { cmd: 'confirm_bookings_many' },
            { bookingIds: allBookingIds },
          ),
        );

        this.logger.log(
          `Payment successful for ${allBookingIds.length} booking(s)`,
        );

        // Gửi email xác nhận và e-ticket for each booking
        for (const currentBookingId of allBookingIds) {
          try {
            const bookingRes = await lastValueFrom(
              this.bookingClient.send<BaseResponse<BookingDto>>(
                { cmd: 'find_one_booking' },
                currentBookingId,
              ),
            );
            const currentBooking = bookingRes?.data;
            if (!currentBooking) continue;

            // Get email from user account OR customerInfo (for guest checkout)
            const customerInfo =
              currentBooking.customerInfo as unknown as Record<
                string,
                string | undefined
              >;
            const recipientEmail =
              currentBooking.user?.email || customerInfo?.email || '';
            const recipientName =
              currentBooking.user?.fullName ||
              customerInfo?.fullName ||
              'Khách hàng';

            if (recipientEmail && currentBooking.ticketCode) {
              // Tạo PDF e-ticket
              const pdfBuffer = await lastValueFrom(
                this.bookingClient.send<Buffer>(
                  { cmd: 'download_eticket_pdf' },
                  currentBooking.ticketCode,
                ),
              );

              const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

              // Gửi email với attachment
              this.supportClient.emit('eticket_ready', {
                email: recipientEmail,
                ticketCode: currentBooking.ticketCode,
                passengerName: recipientName,
                tripDetails: {
                  from:
                    currentBooking.route?.origin?.name ||
                    (currentBooking.route as BookingRouteLiteDto)?.origin
                      ?.name ||
                    '',
                  to:
                    currentBooking.route?.destination?.name ||
                    (currentBooking.route as BookingRouteLiteDto)?.destination
                      ?.name ||
                    '',
                  departureTime: currentBooking.trip?.startTime
                    ? new Date(currentBooking.trip.startTime).toISOString()
                    : '',
                  seatNumber: currentBooking.seat?.seatNumber || '',
                },
                pdfBase64,
              });

              this.logger.log(
                `Confirmation email sent for booking ${currentBookingId} to: ${recipientEmail}`,
              );
            } else {
              this.logger.warn(
                `No email found for booking ${currentBookingId}, skipping email`,
              );
            }
          } catch (emailError) {
            this.logger.error(
              `Failed to send email for booking ${currentBookingId}`,
              emailError,
            );
          }
        }

        // Emit WebSocket event for payment success
        const primaryBookingRes = await lastValueFrom(
          this.bookingClient.send<BaseResponse<BookingDto>>(
            { cmd: 'find_one_booking' },
            bookingId,
          ),
        );
        const primaryTicketCode = primaryBookingRes?.data?.ticketCode;

        this.paymentGateway.emitPaymentSuccess(bookingId, {
          ticketCode: primaryTicketCode || bookingId,
          amount: paymentData.amount,
          bookingIds: allBookingIds,
        });
      } else {
        // Thanh toán thất bại
        await this.prisma.payments.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.failed,
          },
        });

        this.logger.log(
          `Payment failed for booking: ${bookingId}, code: ${webhookCode}`,
        );

        // Emit WebSocket event for payment failure
        this.paymentGateway.emitPaymentFailure(bookingId, {
          reason: webhookData.desc || 'Payment failed',
        });
      }

      return {
        success: true,
        message: isSuccess
          ? 'Payment processed successfully'
          : 'Payment failed',
        bookingId,
        status: isSuccess ? 'successful' : 'failed',
      };
    } catch (error) {
      this.logger.error('Error processing webhook', error);
      throw error;
    }
  }

  /**
   * Kiểm tra trạng thái thanh toán
   */
  async checkPaymentStatus(bookingId: string) {
    const bookingRes = await lastValueFrom(
      this.bookingClient.send<BaseResponse<BookingDto>>(
        { cmd: 'find_one_booking' },
        bookingId,
      ),
    );
    const booking = bookingRes?.data;
    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }

    const payment = await this.prisma.payments.findFirst({
      where: { bookingId, gateway: GatewayType.payos },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      throw new NotFoundException('Payment không tồn tại');
    }

    // Use stored orderCode from database instead of generating new one
    const storedOrderCode = payment.orderCode;
    if (!storedOrderCode) {
      return {
        bookingId,
        paymentId: payment.id,
        status: payment.status,
        amount: Number(payment.amount),
        gateway: payment.gateway,
        error: 'No orderCode found in payment record',
      };
    }

    try {
      const paymentInfo = await this.payosService.getPaymentLinkInformation(
        Number(storedOrderCode),
      );

      // If PayOS returns PAID status but our DB is still pending, update it
      const payosStatus = (paymentInfo as { status?: string })?.status;
      if (
        payosStatus === 'PAID' &&
        payment.status === String(PaymentStatus.pending)
      ) {
        this.logger.log(
          `Syncing payment status for booking ${bookingId}: PayOS=PAID, DB=pending`,
        );

        await this.prisma.payments.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.successful },
        });

        await lastValueFrom(
          this.bookingClient.send<BaseResponse<unknown>>(
            { cmd: 'confirm_bookings_many' },
            { bookingIds: [bookingId] },
          ),
        );
        return {
          bookingId,
          paymentId: payment.id,
          status: PaymentStatus.successful,
          amount: Number(payment.amount),
          gateway: payment.gateway,
          paymentInfo,
          synced: true,
        };
      }

      return {
        bookingId,
        paymentId: payment.id,
        status: payment.status,
        amount: Number(payment.amount),
        gateway: payment.gateway,
        paymentInfo,
      };
    } catch (error) {
      this.logger.error(
        `Error checking payment status: ${(error as Error).message}`,
      );
      return {
        bookingId,
        paymentId: payment.id,
        status: payment.status,
        amount: Number(payment.amount),
        gateway: payment.gateway,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Kiểm tra trạng thái thanh toán theo orderCode (public API cho callback)
   * This endpoint is called by frontend after PayOS redirect - includes auto-sync
   * Now supports multiple bookings (multi-seat payments)
   */
  async checkPaymentStatusByOrderCode(orderCode: number) {
    // First find the payment by orderCode to get all related booking IDs
    const payment = await this.prisma.payments.findUnique({
      where: {
        orderCode: BigInt(orderCode),
      } as unknown as Prisma.PaymentsWhereUniqueInput,
    });

    if (!payment) {
      throw new NotFoundException('Payment không tồn tại');
    }

    // Get all related booking IDs from metadata
    const metadata = payment.metadata as {
      relatedBookingIds?: string[];
    } | null;
    const relatedBookingIds = metadata?.relatedBookingIds || [
      payment.bookingId,
    ];

    // Fetch all related bookings
    const allBookings: BookingDto[] = [];
    for (const id of relatedBookingIds) {
      try {
        const bookingRes = await lastValueFrom(
          this.bookingClient.send<BaseResponse<BookingDto>>(
            { cmd: 'find_one_booking' },
            id,
          ),
        );
        if (bookingRes?.data) allBookings.push(bookingRes.data);
      } catch {
        continue;
      }
    }

    if (allBookings.length === 0) {
      throw new NotFoundException('Booking không tồn tại');
    }

    const primaryBooking = allBookings[0];
    const customerInfo = primaryBooking.customerInfo as unknown as Record<
      string,
      string | undefined
    >;

    // Auto-sync: If DB status is still pending, check PayOS and sync if needed
    let currentStatus = payment?.status || 'pending';

    if (payment && currentStatus === String(PaymentStatus.pending)) {
      try {
        this.logger.log(
          `Checking PayOS status for orderCode: ${orderCode}, current DB status: pending`,
        );

        const paymentInfo =
          await this.payosService.getPaymentLinkInformation(orderCode);
        const payosStatus = (paymentInfo as { status?: string })?.status;

        this.logger.log(`PayOS returned status: ${payosStatus}`);

        if (payosStatus === 'PAID') {
          this.logger.log(
            `Auto-syncing: PayOS=PAID, updating ${relatedBookingIds.length} booking(s) to confirmed`,
          );

          // Update DB to match PayOS status - update all related bookings
          await this.prisma.payments.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.successful,
              gatewayTransactionId:
                (paymentInfo as { id?: string })?.id ||
                payment.gatewayTransactionId,
            },
          });

          await lastValueFrom(
            this.bookingClient.send<BaseResponse<unknown>>(
              { cmd: 'confirm_bookings_many' },
              { bookingIds: relatedBookingIds },
            ),
          );

          currentStatus = PaymentStatus.successful;

          // Send confirmation emails for each booking after sync
          try {
            const recipientEmail =
              primaryBooking.user?.email || customerInfo?.email || '';
            const recipientName =
              primaryBooking.user?.fullName ||
              customerInfo?.fullName ||
              'Khách hàng';

            if (recipientEmail) {
              for (const booking of allBookings) {
                if (!booking.ticketCode) continue;

                const pdfBuffer = await lastValueFrom(
                  this.bookingClient.send<Buffer>(
                    { cmd: 'download_eticket_pdf' },
                    booking.ticketCode,
                  ),
                );

                this.supportClient.emit('eticket_ready', {
                  email: recipientEmail,
                  ticketCode: booking.ticketCode,
                  passengerName: recipientName,
                  tripDetails: {
                    from:
                      (booking.route as BookingRouteLiteDto)?.origin?.name ||
                      '',
                    to:
                      (booking.route as BookingRouteLiteDto)?.destination
                        ?.name || '',
                    departureTime: booking.trip?.startTime
                      ? new Date(booking.trip.startTime).toISOString()
                      : '',
                    seatNumber: booking.seat?.seatNumber || 'N/A',
                  },
                  pdfBase64: Buffer.from(pdfBuffer).toString('base64'),
                });

                this.logger.log(
                  `Confirmation email emitted for ticket ${booking.ticketCode} to: ${recipientEmail} (via auto-sync)`,
                );
              }
            }
          } catch (emailError) {
            this.logger.error(
              'Failed to send confirmation email during auto-sync',
              emailError,
            );
          }
        } else if (payosStatus === 'CANCELLED' || payosStatus === 'EXPIRED') {
          // Update to failed if PayOS says cancelled/expired
          await this.prisma.payments.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.failed },
          });
          currentStatus = PaymentStatus.failed;
        }
      } catch (syncError) {
        this.logger.error(
          `Failed to sync payment status from PayOS: ${(syncError as Error).message}`,
        );
        // Continue with DB status if sync fails
      }
    }

    // Calculate total amount
    const totalAmount = allBookings.reduce(
      (sum, b) => sum + Number(b.price),
      0,
    );

    // Return response with all bookings info
    return {
      // Primary booking info (for backwards compatibility)
      bookingId: primaryBooking.id,
      tripId: primaryBooking.tripId,
      routeId: primaryBooking.routeId,
      ticketCode: primaryBooking.ticketCode,
      status: currentStatus,
      seatNumber: allBookings.map((b) => b.seat?.seatNumber).join(', '),
      passengerName: customerInfo?.fullName,
      email: customerInfo?.email,
      travelDate: primaryBooking.trip?.startTime,
      amount: totalAmount,
      gateway: payment?.gateway,
      // New fields for multi-seat support
      bookingCount: allBookings.length,
      bookings: allBookings.map((booking) => ({
        bookingId: booking.id,
        ticketCode: booking.ticketCode,
        seatNumber: booking.seat?.seatNumber,
        price: Number(booking.price),
      })),
    };
  }

  /**
   * Hủy thanh toán
   */
  async cancelPayment(bookingId: string, reason?: string) {
    const payment = await this.prisma.payments.findFirst({
      where: { bookingId, gateway: GatewayType.payos },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      throw new NotFoundException('Payment không tồn tại');
    }

    if (payment.status === String(PaymentStatus.successful)) {
      throw new BadRequestException(
        'Không thể hủy payment đã thanh toán thành công',
      );
    }

    // Use stored orderCode from database
    const storedOrderCode = payment.orderCode;
    if (!storedOrderCode) {
      throw new BadRequestException('No orderCode found in payment record');
    }

    try {
      await this.payosService.cancelPaymentLink(
        Number(storedOrderCode),
        reason,
      );

      // Cập nhật payment status
      await this.prisma.payments.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.failed },
      });

      this.logger.log(`Payment cancelled for booking: ${bookingId}`);

      return {
        success: true,
        message: 'Payment cancelled successfully',
      };
    } catch (error) {
      this.logger.error(
        `Error cancelling payment: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Check if user has email notifications enabled for a specific type
   */
  // không thấy dùng nên bỏ vô comment nhé
  // private async checkEmailPreference(
  //   userId: string,
  //   notificationType: 'booking' | 'payment' | 'reminder' | 'promotion',
  // ): Promise<boolean> {
  //   try {
  //     const user = await this.prisma.users.findUnique({
  //       where: { id: userId },
  //       select: { notificationPreferences: true },
  //     });

  //     if (!user || !user.notificationPreferences) {
  //       return true; // Default to enabled
  //     }

  //     const prefs = user.notificationPreferences as NotificationPreferences;
  //     return prefs.email?.[notificationType] !== false;
  //   } catch (error) {
  //     this.logger.error('Error checking email preferences:', error);
  //     return true; // Default to enabled on error
  //   }
  // }

  /**
   * Generate orderCode từ bookingId
   * PayOS yêu cầu orderCode là số nguyên dương <= 9007199254740991
   */
  private generateOrderCode(bookingId: string): number {
    // Sử dụng timestamp nhưng chỉ lấy 10 chữ số (seconds + ms)
    const timestamp = Math.floor(Date.now() / 100); // Chia 100 để giảm kích thước
    // Lấy 3 chữ số từ hash bookingId
    const hash =
      bookingId.split('').reduce((acc, char) => {
        return acc + char.charCodeAt(0);
      }, 0) % 1000;

    // Kết hợp để tạo số duy nhất (tối đa 13 chữ số, an toàn cho PayOS)
    return timestamp * 1000 + hash;
  }

  /**
   * Lấy bookingId từ orderCode
   */
  private async getBookingIdFromOrderCode(orderCode: number): Promise<string> {
    // BigInt type not supported in Prisma where clause type definition

    const payment = await this.prisma.payments.findUnique({
      where: {
        orderCode: BigInt(orderCode),
      } as unknown as Prisma.PaymentsWhereUniqueInput,
      select: { bookingId: true },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment not found for orderCode: ${orderCode}`,
      );
    }

    return payment.bookingId;
  }

  async cancelWithRefund(bookingId: string, userId: string, reason?: string) {
    this.logger.log(
      `Request cancel & refund for booking ${bookingId} by user ${userId}`,
    );

    const bookingRes = await lastValueFrom(
      this.bookingClient.send<BaseResponse<BookingDto>>(
        { cmd: 'find_one_booking' },
        bookingId,
      ),
    );

    const booking = bookingRes?.data;
    if (!booking) throw new NotFoundException('Booking does not exist.');

    if (booking.userId !== userId) {
      throw new ForbiddenException(
        'You are not allowed to cancel this ticket.',
      );
    }

    if (booking.status === String(BookingStatus.cancelled)) {
      throw new BadRequestException('This ticket was previously cancelled.');
    }

    const paymentRecord = await this.prisma.payments.findFirst({
      where: { bookingId, status: PaymentStatus.successful },
      orderBy: { createdAt: 'desc' },
    });

    if (!paymentRecord) {
      throw new BadRequestException(
        'Tickets are not yet paid for, please use the regular cancellation function.',
      );
    }

    const bookingRuleRes = await lastValueFrom(
      this.tripClient.send<BaseResponse<unknown>>(
        { cmd: 'get_setting' },
        { key: SettingKey.BOOKING_RULES },
      ),
    );

    const rules = (bookingRuleRes?.data as BookingRulesSettingsDto) || {
      refundPercentage: 100,
      minCancellationHours: 24,
      paymentHoldTimeMinutes: 15,
    };

    const minHours = rules.minCancellationHours || 24;
    const refundPercent = rules.refundPercentage || 100;

    const tripRes = await lastValueFrom(
      this.tripClient.send<BaseResponse<TripDto>>(
        { cmd: 'get_trip_detail' },
        { id: booking.tripId, includeRoutes: false },
      ),
    );

    const trip = tripRes?.data;
    if (!trip?.startTime) throw new NotFoundException('Trip not found');

    const now = new Date();
    const tripStartTime = new Date(trip.startTime);
    const hoursUntilTrip =
      (tripStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilTrip < minHours) {
      throw new BadRequestException(
        `It's too late to cancel the ticket. You must cancel at least ${minHours} hours before departure.`,
      );
    }

    // calculate refund amount
    const originalAmount = Number(paymentRecord.amount);
    const refundAmount = (originalAmount * refundPercent) / 100;
    const feeAmount = originalAmount - refundAmount;

    this.logger.log(
      `Refund calc: ${originalAmount} * ${refundPercent}% = ${refundAmount}`,
    );

    // Update DB & Release Seat
    await this.prisma.payments.update({
      where: { id: paymentRecord.id },
      data: {
        status: PaymentStatus.refunded,
        refundedAmount: refundAmount,
        refundedAt: new Date(),
        refundReason: reason || 'User requested cancellation',
      },
    });

    await lastValueFrom(
      this.bookingClient.send<BaseResponse<BookingResponseDto>>(
        { cmd: 'cancel_booking' },
        { id: bookingId, userId },
      ),
    );

    // send email notification about refund
    try {
      const routeRes = await lastValueFrom(
        this.tripClient.send<BaseResponse<RouteDto>>(
          { cmd: 'find_one_route' },
          booking.routeId,
        ),
      );
      const route = routeRes?.data;
      if (!route) throw new NotFoundException('Route not found');

      const customerInfo = booking.customerInfo as {
        fullName: string;
        email: string;
        phoneNumber: string;
        identificationCard?: string;
      };
      const email = booking.user?.email || customerInfo?.email;
      const name = booking.user?.fullName || customerInfo?.fullName;

      if (email) {
        this.supportClient.emit('refund_processed', {
          email,
          customerName: name,
          refundDetails: {
            ticketCode: booking.ticketCode || bookingId,
            tripName: route
              ? `${route.origin?.name} - ${route.destination?.name}`
              : `${booking.routeId}`,
            refundAmount,
            refundPercent,
            feeAmount,
          },
        });
      }
    } catch (err) {
      this.logger.error('Failed to send refund email', err);
    }

    return {
      success: true,
      message:
        'Ticket cancellation successful. Refund request has been acknowledged and will be processed within 24 business hours.',
      data: {
        bookingId,
        refundAmount,
        refundPercentage: refundPercent,
        status: 'refunded',
      },
    };
  }
}
