import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { ChatMessageDto, ChatResponseDto } from '@app/shared/dto';

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
      const response = await firstValueFrom(
        this.supportClient.send({ cmd: 'chat' }, chatMessageDto),
      );
      return response;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to process chat message',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('confirm-payment')
  @ApiOperation({ summary: 'Confirm payment for a booking' })
  @ApiResponse({
    status: 200,
    description: 'Payment confirmation response',
    type: ChatResponseDto,
  })
  async confirmPayment(
    @Body() body: { sessionId: string; orderCode: string },
  ): Promise<ChatResponseDto> {
    try {
      const response = await firstValueFrom(
        this.supportClient.send({ cmd: 'confirm_payment' }, body),
      );
      return response;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to confirm payment',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
