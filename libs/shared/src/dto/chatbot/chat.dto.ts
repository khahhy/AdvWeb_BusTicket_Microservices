import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({
    description: 'User message to the chatbot',
    example: 'Tìm xe từ Hà Nội đi Sài Gòn ngày mai',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Optional conversation context with pending search params',
    example: {
      conversationId: 'abc123',
      userId: 'user123',
      pendingSearch: {
        originId: 'location-id',
        originName: 'Hà Nội',
        destinationId: null,
        destinationName: null,
        date: null,
      },
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  context?: any;
}

export class TripSearchDto {
  @ApiProperty({ example: 'Hà Nội' })
  origin?: string;

  @ApiProperty({ example: 'Sài Gòn' })
  destination?: string;

  @ApiProperty({ example: '2024-12-21' })
  date?: string;

  @ApiProperty({ example: 1 })
  passengers?: number;
}

export class BookingIntentDto {
  @ApiProperty()
  tripId?: string;

  @ApiProperty({ type: [String] })
  seats?: string[];

  @ApiProperty({ type: [Object] })
  passengers?: any[];
}

export class ChatResponseDto {
  @ApiProperty({
    description: 'Bot response message',
    example: 'Tôi tìm thấy 5 chuyến xe phù hợp với yêu cầu của bạn.',
  })
  message: string;

  @ApiProperty({
    description: 'Type of response',
    example: 'text',
    enum: [
      'text',
      'trip_results',
      'booking_confirmation',
      'faq_answer',
      'seat_selection',
      'passenger_form',
      'payment_selection',
      'payment_link',
      'payment_success',
      'payment_pending',
      'payment_failed',
      'error',
    ],
  })
  type: string;

  @ApiProperty({
    description: 'Additional data related to the response',
    required: false,
  })
  data?: any;

  @ApiProperty({
    description: 'Suggested follow-up actions',
    type: [String],
    required: false,
  })
  suggestions?: string[];
}
