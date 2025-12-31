import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ChatbotService } from './chatbot.service';
import { ChatMessageDto, ChatResponseDto } from '@app/shared/dto';

@Controller()
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @MessagePattern({ cmd: 'chat' })
  async chat(@Payload() dto: ChatMessageDto): Promise<ChatResponseDto> {
    return await this.chatbotService.processMessage(dto);
  }

  @MessagePattern({ cmd: 'get_trip_details' })
  async getTripDetails(@Payload() data: { tripId: string }) {
    // This would call Trip service to get details
    // For now, just pass through
    return { tripId: data.tripId };
  }

  @MessagePattern({ cmd: 'confirm_payment' })
  async confirmPayment(@Payload() orderCode: number): Promise<ChatResponseDto> {
    return await this.chatbotService.confirmPayment(orderCode);
  }
}
