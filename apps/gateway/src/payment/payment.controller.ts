import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Delete,
  Req,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CreatePaymentDto, PayOSWebhookDto } from '@app/shared/dto';
import {
  JwtAuthGuard,
  BaseResponse,
  handleRpcError,
  type RequestWithUser,
} from '@app/shared';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
  ) {}

  @Post('create')
  @ApiOperation({ summary: 'Create payment link' })
  @ApiBody({ type: CreatePaymentDto })
  async createPaymentLink(@Body() dto: CreatePaymentDto) {
    try {
      return await firstValueFrom(
        this.paymentClient.send<BaseResponse<any>>(
          { cmd: 'create_payment_link' },
          dto,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @Post('webhook/payos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'PayOS Webhook' })
  async handlePayOSWebhook(@Body() webhookData: PayOSWebhookDto) {
    return await firstValueFrom(
      this.paymentClient.send({ cmd: 'handle_payos_webhook' }, webhookData),
    );
  }

  @Delete('cancel/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cancel pending payment' })
  async cancelPayment(
    @Param('bookingId') bookingId: string,
    @Body() body?: { reason?: string },
  ) {
    try {
      return await firstValueFrom(
        this.paymentClient.send<BaseResponse<any>>(
          { cmd: 'cancel_payment' },
          { bookingId, reason: body?.reason },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @Post('refund/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Request refund for paid ticket' })
  async cancelWithRefund(
    @Param('bookingId') bookingId: string,
    @Req() req: RequestWithUser,
    @Body() body: { reason?: string },
  ) {
    try {
      return await firstValueFrom(
        this.paymentClient.send<BaseResponse<any>>(
          { cmd: 'refund_payment' },
          { bookingId, userId: req.user.userId, reason: body?.reason },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }
}
