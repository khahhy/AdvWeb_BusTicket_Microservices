import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
  Req,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import {
  CreatePaymentDto,
  PayOSWebhookDto,
  CreatePaymentLinkResponseDto,
  PayOSWebhookResponseDto,
  PaymentStatusResponseDto,
  CancelPaymentResponseDto,
  RefundPaymentResponseDto,
} from '@app/shared/dto';
import {
  JwtAuthGuard,
  BaseResponse,
  handleRpcError,
  type RequestWithUser,
} from '@app/shared';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
  ) {}

  @Post('create')
  @ApiOperation({
    summary: 'Tạo link thanh toán cho booking (public for guest checkout)',
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({
    status: 201,
    description: 'Payment link created successfully',
    type: CreatePaymentLinkResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Booking không tồn tại' })
  @ApiResponse({
    status: 400,
    description: 'Booking đã được thanh toán hoặc đã bị hủy',
  })
  async createPaymentLink(@Body() dto: CreatePaymentDto) {
    try {
      return await firstValueFrom(
        this.paymentClient.send<BaseResponse<CreatePaymentLinkResponseDto>>(
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
  @ApiOperation({ summary: 'Webhook từ PayOS để xử lý kết quả thanh toán' })
  @ApiBody({ type: PayOSWebhookDto })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    type: PayOSWebhookResponseDto,
  })
  async handlePayOSWebhook(@Body() webhookData: PayOSWebhookDto) {
    return await firstValueFrom(
      this.paymentClient.send<PayOSWebhookResponseDto>(
        { cmd: 'handle_payos_webhook' },
        webhookData,
      ),
    );
  }

  @Get('status/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Kiểm tra trạng thái thanh toán của booking' })
  @ApiParam({ name: 'bookingId', description: 'ID của booking' })
  @ApiResponse({
    status: 200,
    description: 'Payment status retrieved successfully',
    type: PaymentStatusResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Booking hoặc Payment không tồn tại',
  })
  async checkPaymentStatus(@Param('bookingId') bookingId: string) {
    try {
      return await firstValueFrom(
        this.paymentClient.send<BaseResponse<PaymentStatusResponseDto>>(
          { cmd: 'check_payment_status' },
          bookingId,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @Get('status-by-order/:orderCode')
  @ApiOperation({
    summary: 'Kiểm tra trạng thái thanh toán theo orderCode (public)',
  })
  @ApiParam({ name: 'orderCode', description: 'OrderCode từ PayOS' })
  @ApiResponse({
    status: 200,
    description: 'Payment status retrieved successfully',
    type: PaymentStatusResponseDto,
  })
  async checkPaymentStatusByOrderCode(@Param('orderCode') orderCode: string) {
    try {
      return await firstValueFrom(
        this.paymentClient.send<BaseResponse<PaymentStatusResponseDto>>(
          { cmd: 'check_payment_status_by_order_code' },
          Number(orderCode),
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @Delete('cancel/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Hủy payment link' })
  @ApiParam({ name: 'bookingId', description: 'ID của booking' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          example: 'Khách hàng không muốn thanh toán nữa',
        },
      },
    },
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Payment cancelled successfully',
    type: CancelPaymentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Booking hoặc Payment không tồn tại',
  })
  @ApiResponse({
    status: 400,
    description: 'Không thể hủy payment đã thanh toán thành công',
  })
  async cancelPayment(
    @Param('bookingId') bookingId: string,
    @Body() body?: { reason?: string },
  ) {
    try {
      return await firstValueFrom(
        this.paymentClient.send<BaseResponse<CancelPaymentResponseDto>>(
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
  @ApiOperation({
    summary: 'Cancels PAID ticket and refunds',
    description:
      'This API will check the ticket, calculate the refund, update the database and send an email. It does not call the real bank.',
  })
  @ApiParam({
    name: 'bookingId',
    description: 'ID of the booking to be canceled',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          example: 'I am unexpectedly busy',
        },
      },
    },
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Cancels ticket and refunds successfully work',
    type: RefundPaymentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Unpaid or overdue ticket' })
  @ApiResponse({ status: 403, description: 'Not the rightful owner' })
  async cancelWithRefund(
    @Param('bookingId') bookingId: string,
    @Req() req: RequestWithUser,
    @Body() body: { reason?: string },
  ) {
    try {
      return await firstValueFrom(
        this.paymentClient.send<BaseResponse<RefundPaymentResponseDto>>(
          { cmd: 'refund_payment' },
          { bookingId, userId: req.user.userId, reason: body?.reason },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }
}
