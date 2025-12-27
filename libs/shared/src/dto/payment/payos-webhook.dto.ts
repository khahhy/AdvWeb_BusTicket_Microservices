import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PayOSWebhookDataDto {
  @ApiProperty({ description: 'Mã đơn hàng', example: 123456 })
  @IsNumber()
  orderCode: number;

  @ApiProperty({ description: 'Số tiền', example: 100000 })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Mô tả giao dịch', example: 'Thanh toán vé xe' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Số tài khoản' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ description: 'Mã tham chiếu' })
  @IsString()
  reference: string;

  @ApiProperty({ description: 'Thời gian giao dịch' })
  @IsString()
  transactionDateTime: string;

  @ApiProperty({ description: 'Loại tiền tệ', example: 'VND' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'ID link thanh toán' })
  @IsString()
  paymentLinkId: string;

  @ApiProperty({ description: 'Mã trạng thái', example: '00' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ description: 'Mô tả trạng thái', example: 'success' })
  @IsString()
  @IsOptional()
  desc?: string;

  @ApiProperty({ description: 'ID ngân hàng đối tác', required: false })
  @IsString()
  @IsOptional()
  counterAccountBankId?: string;

  @ApiProperty({ description: 'Tên ngân hàng đối tác', required: false })
  @IsString()
  @IsOptional()
  counterAccountBankName?: string;

  @ApiProperty({ description: 'Tên tài khoản đối tác', required: false })
  @IsString()
  @IsOptional()
  counterAccountName?: string;

  @ApiProperty({ description: 'Số tài khoản đối tác', required: false })
  @IsString()
  @IsOptional()
  counterAccountNumber?: string;

  @ApiProperty({ description: 'Tên tài khoản ảo', required: false })
  @IsString()
  @IsOptional()
  virtualAccountName?: string;

  @ApiProperty({ description: 'Số tài khoản ảo', required: false })
  @IsString()
  @IsOptional()
  virtualAccountNumber?: string;
}

export class PayOSWebhookDto {
  @ApiProperty({ description: 'Mã trạng thái webhook', example: '00' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Mô tả trạng thái', example: 'success' })
  @IsString()
  @IsNotEmpty()
  desc: string;

  @ApiProperty({ description: 'Dữ liệu thanh toán' })
  @ValidateNested()
  @Type(() => PayOSWebhookDataDto)
  data: PayOSWebhookDataDto;

  @ApiProperty({ description: 'Chữ ký xác thực', required: false })
  @IsString()
  @IsOptional()
  signature?: string;
}
