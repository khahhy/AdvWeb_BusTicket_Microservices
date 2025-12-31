/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { GeminiService } from './gemini.service';
import { ChatMessageDto, ChatResponseDto } from '@app/shared/dto';
import type {
  ChatContext,
  PendingSearch,
  ParsedIntent,
  BookingState,
} from '@app/shared/type';

interface Location {
  id: number;
  city: string;
  name: string;
}

interface SearchParams {
  originCity?: string | null;
  destinationCity?: string | null;
  date?: string | null;
  needMoreInfo?: boolean;
  clarificationMessage?: string;
  originIds?: number[];
  destinationIds?: number[];
  originName?: string;
  destinationName?: string;
}

interface CustomerInfo {
  fullName?: string;
  email?: string;
  phone?: string;
  name?: string;
}

interface BookingData {
  user?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  data?: unknown;
  bookingIds?: string[];
  bookingId?: string;
  name?: string;
  email?: string;
}

interface PaymentData {
  paymentId?: string;
  checkoutUrl?: string;
  qrCode?: string;
  amount?: number;
  orderCode?: number;
  status?: string;
  message?: string;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private geminiService: GeminiService,
    @Inject('TRIP_SERVICE') private tripClient: ClientProxy,
    @Inject('BOOKING_SERVICE') private bookingClient: ClientProxy,
    @Inject('PAYMENT_SERVICE') private paymentClient: ClientProxy,
  ) {}

  private removeVietnameseAccents(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  private matchesCityParts(searchTerm: string, cityName: string): boolean {
    const cityParts = cityName.split(/[\s-]+/);
    const searchParts = searchTerm.split(/[\s-]+/);

    return searchParts.every((searchPart) =>
      cityParts.some(
        (cityPart) =>
          cityPart.includes(searchPart) || searchPart.includes(cityPart),
      ),
    );
  }

  private generateTextSeatMap(
    availableSeats: string[],
    bookedSeats: string[],
  ): string {
    const seatsByRow: Record<string, string[]> = {};

    [...availableSeats, ...bookedSeats].forEach((seat) => {
      const row = seat.charAt(0);
      if (!seatsByRow[row]) seatsByRow[row] = [];
      seatsByRow[row].push(seat);
    });

    const rows = Object.keys(seatsByRow).sort();

    let map = '';
    rows.forEach((row) => {
      const seats = seatsByRow[row].sort();
      const available = seats.filter((s) => availableSeats.includes(s));
      const booked = seats.filter((s) => bookedSeats.includes(s));

      map += `Hàng ${row}: `;

      if (available.length > 0) {
        map += available.map((s) => `[${s}]`).join(' ');
      }

      if (booked.length > 0) {
        if (available.length > 0) map += ' ';
        map += booked.map((s) => `[${s}✗]`).join(' ');
      }

      map += '\n';
    });

    return map;
  }

  async processMessage(dto: ChatMessageDto): Promise<ChatResponseDto> {
    try {
      // Check if we're in an active booking flow
      if (dto.context?.bookingState?.stage) {
        this.logger.log(
          `Active booking flow detected - stage: ${String(dto.context.bookingState.stage)}`,
        );
        return await this.handleBooking(dto.message, {}, dto.context);
      }

      // Check if we're in an active search flow
      if (dto.context?.pendingSearch) {
        this.logger.log('Active search flow detected');
        return await this.handleTripSearch(dto.message, {}, dto.context);
      }

      // Parse user intent for new conversations
      const parsed: ParsedIntent = await this.geminiService.parseUserIntent(
        dto.message,
      );

      this.logger.log(`Detected intent: ${parsed.intent}`, parsed.entities);

      // Route to appropriate handler
      switch (parsed.intent) {
        case 'search_trip':
          return await this.handleTripSearch(
            dto.message,
            parsed.entities,
            dto.context,
          );
        case 'booking':
          return await this.handleBooking(
            dto.message,
            parsed.entities,
            dto.context,
          );
        case 'faq':
          return await this.handleFAQ(dto.message);
        default:
          return await this.handleGeneral(dto.message);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error processing message: ${err.message}`);
      return {
        message: 'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.',
        type: 'text',
      };
    }
  }

  private async handleTripSearch(
    userMessage: string,
    entities: ParsedIntent['entities'],
    context?: ChatContext,
  ): Promise<ChatResponseDto> {
    try {
      const pendingSearch: PendingSearch = context?.pendingSearch || {};

      // Get all locations from Trip service via TCP
      const locations = await firstValueFrom(
        this.tripClient.send({ cmd: 'get_all_locations' }, {}),
      );

      // Build context-aware prompt
      const contextInfo =
        pendingSearch.originCity || pendingSearch.destinationCity
          ? `\nPrevious context:
- Origin: ${pendingSearch.originCity || 'not specified'}
- Destination: ${pendingSearch.destinationCity || 'not specified'}
- Date: ${pendingSearch.date || 'not specified'}

Merge with context.`
          : '';

      // Use AI to extract city names
      const prompt = `Extract origin and destination CITY names from: "${userMessage}"

${contextInfo}

Return JSON format (replace null with actual null, not string):
{
  "originCity": "city name" or null,
  "destinationCity": "city name" or null,
  "date": "YYYY-MM-DD" or null,
  "needMoreInfo": true/false,
  "clarificationMessage": "message if needed"
}

Examples:
- "tìm xe từ HCM đi Vũng Tàu" → originCity: "Ho Chi Minh", destinationCity: "Vung Tau"
- "từ Sài Gòn đến Đà Nẵng" → originCity: "Sai Gon", destinationCity: "Da Nang"

City name variations to recognize:
- "HCM", "Sài Gòn", "Saigon" → "Ho Chi Minh"
- "Vũng Tàu", "Bà Rịa" → "Ba Ria - Vung Tau"

CRITICAL: Return ONLY valid JSON. Use null (not "null" string) for missing values.`;

      const aiResponse = await this.geminiService.generateResponse(prompt);
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }

      let searchParams: SearchParams = JSON.parse(jsonMatch[0]) as SearchParams;

      // Merge with pending search context
      searchParams = {
        originCity: searchParams.originCity || pendingSearch.originCity || null,
        destinationCity:
          searchParams.destinationCity || pendingSearch.destinationCity || null,
        date: searchParams.date || pendingSearch.date || null,
        needMoreInfo: searchParams.needMoreInfo,
        clarificationMessage: searchParams.clarificationMessage,
      };

      // Find matching locations
      if (searchParams.originCity) {
        const normalizedOrigin = this.removeVietnameseAccents(
          searchParams.originCity.toLowerCase(),
        );
        const originLocations = (locations as Location[]).filter((l) => {
          const normalizedCity = this.removeVietnameseAccents(
            l.city.toLowerCase(),
          );
          const normalizedName = this.removeVietnameseAccents(
            l.name.toLowerCase(),
          );

          return (
            normalizedCity.includes(normalizedOrigin) ||
            normalizedOrigin.includes(normalizedCity) ||
            normalizedName.includes(normalizedOrigin) ||
            this.matchesCityParts(normalizedOrigin, normalizedCity)
          );
        });
        searchParams.originIds = originLocations.map((l) => l.id);
        searchParams.originName = searchParams.originCity;
      }

      if (searchParams.destinationCity) {
        const normalizedDest = this.removeVietnameseAccents(
          searchParams.destinationCity.toLowerCase(),
        );
        const destLocations = (locations as Location[]).filter((l) => {
          const normalizedCity = this.removeVietnameseAccents(
            l.city.toLowerCase(),
          );
          const normalizedName = this.removeVietnameseAccents(
            l.name.toLowerCase(),
          );

          return (
            normalizedCity.includes(normalizedDest) ||
            normalizedDest.includes(normalizedCity) ||
            normalizedName.includes(normalizedDest) ||
            this.matchesCityParts(normalizedDest, normalizedCity)
          );
        });
        searchParams.destinationIds = destLocations.map((l) => l.id);
        searchParams.destinationName = searchParams.destinationCity;
      }

      // Check if we need more info
      if (
        !searchParams.originIds?.length ||
        !searchParams.destinationIds?.length
      ) {
        searchParams.needMoreInfo = true;

        if (
          !searchParams.originIds?.length &&
          !searchParams.destinationIds?.length
        ) {
          searchParams.clarificationMessage =
            'Bạn muốn đi từ đâu đến đâu? Ví dụ: "Hà Nội đi Đà Nẵng"';
        } else if (!searchParams.destinationIds?.length) {
          searchParams.clarificationMessage = `Bạn muốn đi từ ${searchParams.originName} đến đâu?`;
        } else if (!searchParams.originIds?.length) {
          searchParams.clarificationMessage = `Bạn muốn đi từ đâu đến ${searchParams.destinationName}?`;
        }
      }

      if (searchParams.needMoreInfo) {
        return {
          message: searchParams.clarificationMessage ?? '',
          type: 'text',
          data: {
            pendingSearch: searchParams,
          },
          suggestions: [
            'Hà Nội - Đà Nẵng',
            'Sài Gòn - Vũng Tàu',
            'Đà Nẵng - Hội An',
          ],
        };
      }

      // Search for trips via Trip service
      const trips = await this.searchTrips(searchParams);

      if (trips.length === 0) {
        const noResultMessage =
          searchParams.originName && searchParams.destinationName
            ? `Không tìm thấy chuyến xe từ ${searchParams.originName} đến ${searchParams.destinationName}${searchParams.date ? ` vào ngày ${searchParams.date}` : ''}.`
            : 'Không tìm thấy chuyến xe phù hợp.';

        return {
          message: `${noResultMessage} Bạn có thể thử ngày khác hoặc tuyến đường khác.`,
          type: 'text',
          suggestions: ['Tìm ngày mai', 'Tìm cuối tuần', 'Xem tuyến khác'],
        };
      }

      // Generate friendly response
      const routeInfo = trips[0]?.tripRoutes?.[0]?.route;
      const fromLocation =
        routeInfo?.origin?.name || searchParams.originName || 'điểm đi';
      const toLocation =
        routeInfo?.destination?.name ||
        searchParams.destinationName ||
        'điểm đến';

      const responseMessage =
        trips.length === 1
          ? `Tìm thấy 1 chuyến xe từ ${fromLocation} đến ${toLocation}! 🚌`
          : `Tìm thấy ${trips.length} chuyến xe từ ${fromLocation} đến ${toLocation}! 🚌`;

      return {
        message: responseMessage,
        type: 'trip_results',
        data: {
          trips,
          searchParams,
          summary: {
            count: trips.length,
            from: fromLocation,
            to: toLocation,
            date: searchParams.date,
          },
        },
        suggestions: ['Xem tất cả chuyến', 'Đặt vé ngay', 'Tìm chuyến khác'],
      };
    } catch (error) {
      this.logger.error(`Error in trip search: ${error.message}`);
      return {
        message:
          'Tôi có thể giúp bạn tìm chuyến xe. Bạn muốn đi từ đâu đến đâu?',
        type: 'text',
        suggestions: [
          'Hà Nội đi Sài Gòn',
          'Đà Nẵng đi Hội An',
          'Hỏi về giá vé',
        ],
      };
    }
  }

  private async searchTrips(params: SearchParams) {
    const { originIds, destinationIds, date } = params;

    let startDate = new Date();
    if (date && date !== 'null') {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        startDate = parsedDate;
      }
    }

    // Call Trip service to search trips
    const trips = await firstValueFrom(
      this.tripClient.send(
        { cmd: 'search_trips' },
        {
          originIds,
          destinationIds,
          startDate: startDate.toISOString(),
        },
      ),
    );

    return trips;
  }

  private async handleBooking(
    userMessage: string,
    _entities: Record<string, unknown>,
    context?: ChatContext,
  ): Promise<ChatResponseDto> {
    const bookingState = (context?.bookingState || {}) as BookingState;
    const stage = bookingState.stage || 'init';

    // Check if user wants to view seat map
    if (
      userMessage.toLowerCase().includes('sơ đồ ghế') ||
      userMessage.toLowerCase().includes('xem ghế') ||
      userMessage.toLowerCase().includes('ghế trống')
    ) {
      const { tripId, routeId } = bookingState;

      if (!tripId || !routeId) {
        return {
          message: 'Vui lòng chọn chuyến xe trước để xem sơ đồ ghế.',
          type: 'text',
          suggestions: ['Tìm chuyến xe'],
        };
      }

      try {
        // Get seat status from Booking service
        const seatStatus = await firstValueFrom(
          this.bookingClient.send(
            { cmd: 'get_seat_status' },
            { tripId, routeId },
          ),
        );

        const { availableSeats, bookedSeats } = seatStatus;
        const seatMap = this.generateTextSeatMap(availableSeats, bookedSeats);

        return {
          message: `Sơ đồ ghế:\n\n${seatMap}\n\nGhế trống (${availableSeats.length}): ${availableSeats.slice(0, 10).join(', ')}${availableSeats.length > 10 ? '...' : ''}\nĐã đặt: ${bookedSeats.length} ghế\n\nNhập số ghế bạn muốn chọn (vd: A1, B2):`,
          type: 'seat_selection',
          data: {
            tripId,
            routeId,
            bookingState,
            availableSeats,
          },
          suggestions: availableSeats.slice(0, 3),
        };
      } catch (error) {
        this.logger.error(
          `Error fetching seat status: ${(error as Error).message}`,
        );
        return {
          message: 'Không thể lấy thông tin ghế. Vui lòng thử lại sau.',
          type: 'seat_selection',
          data: {
            tripId,
            routeId,
            bookingState,
          },
          suggestions: ['A1', 'A2', 'B1'],
        };
      }
    }

    // Parse seat selection
    if (stage === 'seat_selection') {
      const seatPattern = /\b([A-D]\d{1,2})\b/gi;
      const seats = userMessage.match(seatPattern) || [];

      if (seats.length > 0 && seats.length < 10 && !userMessage.includes('-')) {
        const totalPrice = seats.length * (bookingState.basePrice || 0);

        return {
          message: `Đã chọn ${seats.length} ghế: ${seats.join(', ')}\n\nVui lòng cung cấp thông tin hành khách:\n\nHọ tên:\nEmail:\nSố điện thoại:\n\nVí dụ: "Nguyễn Văn A, example@email.com, 0912345678"`,
          type: 'passenger_form',
          data: {
            bookingState: {
              ...bookingState,
              stage: 'passenger_details',
              selectedSeats: seats,
              totalPrice,
            },
          },
          suggestions: ['Nhập thông tin'],
        };
      }
    }

    // Parse passenger info
    if (stage === 'passenger_details') {
      const parts = userMessage.split(',').map((s) => s.trim());

      if (parts.length >= 3 || userMessage.includes('@')) {
        const name = parts[0] || 'Khách hàng';
        const email = parts.find((p) => p.includes('@')) || '';
        const phone = parts.find((p) => /\d{9,11}/.test(p)) || '';

        return {
          message: `Thông tin đã nhận!\n\nTên: ${name}\nEmail: ${email}\nSĐT: ${phone}\n\nTổng tiền: ${bookingState.totalPrice?.toLocaleString('vi-VN')} VND\n\nChọn phương thức thanh toán:`,
          type: 'payment_selection',
          data: {
            bookingState: {
              ...bookingState,
              stage: 'payment',
              passengerInfo: { name, email, phone },
            },
          },
          suggestions: ['Thanh toán online', 'Thanh toán tại bến'],
        };
      }
    }

    // Stage 1: Initial
    if (stage === 'init') {
      return {
        message:
          'Để đặt vé, bạn cần chọn chuyến xe trước. Bạn muốn tìm chuyến từ đâu đến đâu?',
        type: 'text',
        data: {
          bookingState: { stage: 'selecting_trip' },
        },
        suggestions: ['Hà Nội đi Đà Nẵng', 'Hồ Chí Minh đi Kiên Giang'],
      };
    }

    // Stage 4: Payment
    if (stage === 'payment') {
      const {
        passengerInfo,
        selectedSeats,
        selectedSeatIds,
        totalPrice,
        tripId,
        routeId,
      } = bookingState;
      const userId = context?.user?.id;

      try {
        // Create booking via Booking service
        const bookingResult = await firstValueFrom(
          this.bookingClient.send(
            { cmd: 'create_booking' },
            {
              userId,
              tripId,
              routeId,
              seatIds: selectedSeatIds,
              customerInfo: {
                fullName: (passengerInfo as CustomerInfo).name,
                email: (passengerInfo as CustomerInfo).email,
                phoneNumber: (passengerInfo as CustomerInfo).phone,
                identificationCard: (passengerInfo as CustomerInfo).phone,
              },
            },
          ),
        );

        const bookingData = bookingResult.data;
        const bookingIds = bookingResult.bookingIds;
        const primaryBookingId = bookingResult.bookingId;

        // Create payment link via Payment service
        const paymentResult = await firstValueFrom(
          this.paymentClient.send(
            { cmd: 'create_payment_link' },
            {
              bookingId: primaryBookingId,
              bookingIds: bookingIds,
              totalAmount: totalPrice,
              buyerName: (passengerInfo as CustomerInfo).name,
              buyerEmail: (passengerInfo as CustomerInfo).email,
            },
          ),
        );

        return {
          message: `Đặt vé thành công!\n\nTên: ${(passengerInfo as CustomerInfo).name}\nEmail: ${(passengerInfo as CustomerInfo).email}\nSĐT: ${(passengerInfo as CustomerInfo).phone}\nGhế: ${(selectedSeats as string[])?.join(', ')}\nTổng tiền: ${(totalPrice as number)?.toLocaleString('vi-VN')} VND\n\nVui lòng quét mã QR để thanh toán.`,
          type: 'payment_link',
          data: {
            bookingIds: bookingIds,
            paymentId: paymentResult.paymentId,
            checkoutUrl: paymentResult.checkoutUrl,
            qrCode: paymentResult.qrCode,
            amount: paymentResult.amount,
            orderCode: paymentResult.orderCode,
            showConfirmButton: true,
            confirmButtonText: 'Xác nhận đã thanh toán',
          },
          suggestions: ['Xác nhận đã thanh toán', 'Cần hỗ trợ'],
        };
      } catch (error) {
        this.logger.error(
          `Error creating booking/payment: ${(error as Error).message}`,
        );
        return {
          message: `Có lỗi xảy ra khi tạo đặt vé:\n${(error as Error).message}\n\nVui lòng thử lại.`,
          type: 'error',
          suggestions: ['Thử lại', 'Tìm chuyến mới'],
        };
      }
    }

    return {
      message: 'Để đặt vé, hãy bắt đầu bằng cách tìm chuyến xe bạn muốn.',
      type: 'text',
      suggestions: ['Tìm chuyến xe'],
    };
  }

  private async handleFAQ(userMessage: string): Promise<ChatResponseDto> {
    const faqKnowledge = `
# Câu hỏi thường gặp - Đặt vé xe khách

## 1. Chính sách hủy vé
**Hủy vé trước 24 giờ:** Hoàn lại 80% giá vé
**Hủy vé trước 12 giờ:** Hoàn lại 50% giá vé
**Hủy trong vòng 12 giờ:** Không hoàn tiền

## 2. Quy trình hoàn tiền
- Thời gian xử lý: 5-7 ngày làm việc
- Hoàn về tài khoản thanh toán ban đầu

## 3. Phương thức thanh toán
- Thẻ ATM, Visa/Mastercard
- Ví điện tử: Momo, ZaloPay
- Thanh toán tại bến

## 4. Liên hệ
- Hotline: 1900-xxxx (24/7)
- Email: support@busticket.com
`;

    const prompt = `
Bạn là trợ lý hỗ trợ khách hàng cho hệ thống đặt vé xe khách.

Cơ sở kiến thức:
${faqKnowledge}

Câu hỏi: "${userMessage}"

Trả lời ngắn gọn, chuyên nghiệp bằng tiếng Việt (dưới 150 từ).
`;

    const response = await this.geminiService.generateResponse(prompt);

    return {
      message: response.trim(),
      type: 'faq_answer',
      suggestions: ['Hỏi câu khác', 'Tìm chuyến xe', 'Chính sách hoàn tiền'],
    };
  }

  private async handleGeneral(userMessage: string): Promise<ChatResponseDto> {
    const prompt = `
You are a friendly bus booking assistant.

User message: "${userMessage}"

Generate a warm, helpful response in Vietnamese that offers to help with booking or searching trips.
Keep it brief and conversational.
`;

    const response = await this.geminiService.generateResponse(prompt);

    return {
      message: response.trim(),
      type: 'text',
      suggestions: [
        'Tìm chuyến Hà Nội - Đà Nẵng',
        'Chính sách hủy vé',
        'Liên hệ hỗ trợ',
      ],
    };
  }

  async confirmPayment(orderCode: number): Promise<ChatResponseDto> {
    try {
      this.logger.log(`Confirming payment for orderCode: ${orderCode}`);

      // Check payment status via Payment service
      const paymentStatus = await firstValueFrom(
        this.paymentClient.send(
          { cmd: 'check_payment_status_by_order_code' },
          orderCode,
        ),
      );

      if (!paymentStatus) {
        return {
          message: 'Không tìm thấy thông tin thanh toán.',
          type: 'error',
          suggestions: ['Cần hỗ trợ'],
        };
      }

      if (paymentStatus.status === 'successful') {
        return {
          message: `Thanh toán thành công!\n\nVé điện tử đã được gửi qua email.\nMã đơn hàng: ${orderCode}\nSố tiền: ${paymentStatus.amount?.toLocaleString('vi-VN')} VND`,
          type: 'payment_success',
          data: {
            orderCode,
            amount: paymentStatus.amount,
            status: paymentStatus.status,
          },
          suggestions: ['Xem vé của tôi', 'Tìm chuyến mới'],
        };
      } else if (paymentStatus.status === 'pending') {
        return {
          message: `Thanh toán đang chờ xử lý...\n\nMã đơn hàng: ${orderCode}`,
          type: 'payment_pending',
          data: {
            orderCode,
            status: paymentStatus.status,
          },
          suggestions: ['Kiểm tra lại', 'Cần hỗ trợ'],
        };
      } else {
        return {
          message: `Thanh toán không thành công.\n\nMã đơn hàng: ${orderCode}`,
          type: 'payment_failed',
          data: {
            orderCode,
            status: paymentStatus.status,
          },
          suggestions: ['Thử lại', 'Cần hỗ trợ'],
        };
      }
    } catch (error) {
      this.logger.error(
        `Error confirming payment: ${(error as Error).message}`,
      );
      return {
        message: 'Có lỗi xảy ra khi kiểm tra thanh toán.',
        type: 'error',
        suggestions: ['Thử lại', 'Cần hỗ trợ'],
      };
    }
  }
}
