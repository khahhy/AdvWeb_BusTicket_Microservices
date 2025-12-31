import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import {
  ChatMessageDto,
  ChatResponseDto,
  ConfirmPaymentDto,
} from '@app/shared/dto';

@ApiTags('Chatbot')
@Controller('chatbot')
export class ChatbotController {
  constructor(
    @Inject('SUPPORT_SERVICE') private readonly supportClient: ClientProxy,
  ) {}

  @Post('chat')
  @ApiOperation({ summary: 'Send a message to the chatbot' })
  @ApiResponse({
    status: 200,
    description: 'Chatbot response',
    type: ChatResponseDto,
  })
  async chat(@Body() chatMessageDto: ChatMessageDto): Promise<ChatResponseDto> {
    try {
      const response: ChatResponseDto = await firstValueFrom(
        this.supportClient.send({ cmd: 'chat' }, chatMessageDto),
      );
      return response;
    } catch (error) {
      const err = error as { message?: string; status?: number };
      throw new HttpException(
        err.message || 'Failed to process chat message',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('confirm-payment')
  @ApiOperation({
    summary: 'Confirm payment status for a booking',
    description:
      'Check payment status by order code and return chatbot-friendly response',
  })
  @ApiBody({
    type: ConfirmPaymentDto,
    description: 'Payment confirmation request',
    examples: {
      example1: {
        summary: 'Confirm payment',
        value: {
          orderCode: 123456,
          sessionId: 'session-abc123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Payment confirmation response',
    type: ChatResponseDto,
    examples: {
      success: {
        summary: 'Payment successful',
        value: {
          message:
            'Thanh toán thành công!\n\nVé điện tử đã được gửi qua email.\nMã đơn hàng: 123456\nSố tiền: 500,000 VND',
          type: 'payment_success',
          data: {
            orderCode: 123456,
            amount: 500000,
            status: 'successful',
          },
          suggestions: ['Xem vé của tôi', 'Tìm chuyến mới'],
        },
      },
      pending: {
        summary: 'Payment pending',
        value: {
          message: 'Thanh toán đang chờ xử lý...\n\nMã đơn hàng: 123456',
          type: 'payment_pending',
          data: {
            orderCode: 123456,
            status: 'pending',
          },
          suggestions: ['Kiểm tra lại', 'Cần hỗ trợ'],
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async confirmPayment(
    @Body() dto: ConfirmPaymentDto,
  ): Promise<ChatResponseDto> {
    try {
      const response: ChatResponseDto = await firstValueFrom(
        this.supportClient.send({ cmd: 'confirm_payment' }, dto.orderCode),
      );
      return response;
    } catch (error) {
      const err = error as { message?: string; status?: number };
      throw new HttpException(
        err.message || 'Failed to confirm payment',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
