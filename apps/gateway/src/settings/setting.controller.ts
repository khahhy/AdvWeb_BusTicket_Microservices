import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import {
  GeneralSettingsDto,
  BookingRulesSettingsDto,
  BusAmenitiesSettingsDto,
  PaymentGatewaySettingsDto,
  BusTypePricingDto,
  PricingPoliciesDto,
} from '@app/shared/dto';
import {
  SettingKey,
  UserRole,
  JwtAuthGuard,
  RolesGuard,
  Roles,
  BaseResponse,
  handleRpcError,
  SettingsValueDto,
  type RequestWithUser,
} from '@app/shared';

@ApiTags('Settings')
@Controller('settings')
export class SettingController {
  constructor(
    @Inject('TRIP_SERVICE') private readonly tripClient: ClientProxy,
  ) {}

  private createPayload(dto: SettingsValueDto, req: RequestWithUser) {
    return {
      dto,
      userId: req.user.userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
  }

  @ApiOperation({ summary: 'Get General System Settings (Public)' })
  @ApiResponse({ status: 200, type: GeneralSettingsDto })
  @Get('general')
  async getGeneralSettings() {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<GeneralSettingsDto>>(
          { cmd: 'get_setting' },
          SettingKey.GENERAL,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update General System Settings (Admin)' })
  @ApiBody({ type: GeneralSettingsDto })
  @Patch('general')
  async upsertGeneral(
    @Body() dto: GeneralSettingsDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<GeneralSettingsDto>>(
          { cmd: 'upsert_setting' },
          { key: SettingKey.GENERAL, ...this.createPayload(dto, req) },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({ summary: 'Get Booking Rules (Public)' })
  @ApiResponse({ status: 200, type: BookingRulesSettingsDto })
  @Get('booking-rules')
  async getBookingRules() {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<BookingRulesSettingsDto>>(
          { cmd: 'get_setting' },
          SettingKey.BOOKING_RULES,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update Booking Rules (Admin)' })
  @ApiBody({ type: BookingRulesSettingsDto })
  @Patch('booking-rules')
  async upsertBookingRules(
    @Body() dto: BookingRulesSettingsDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<BookingRulesSettingsDto>>(
          { cmd: 'upsert_setting' },
          { key: SettingKey.BOOKING_RULES, ...this.createPayload(dto, req) },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({ summary: 'Get List of Bus Amenities (Public)' })
  @ApiResponse({ status: 200, type: BusAmenitiesSettingsDto })
  @Get('bus-amenities')
  async getBusAmenities() {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<BusAmenitiesSettingsDto>>(
          { cmd: 'get_setting' },
          SettingKey.BUS_AMENITIES,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update Bus Amenities List (Admin)' })
  @ApiBody({ type: BusAmenitiesSettingsDto })
  @Patch('bus-amenities')
  async upsertBusAmenities(
    @Body() dto: BusAmenitiesSettingsDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<BusAmenitiesSettingsDto>>(
          { cmd: 'upsert_setting' },
          { key: SettingKey.BUS_AMENITIES, ...this.createPayload(dto, req) },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({ summary: 'Get Bus Type Pricing Multipliers (Public)' })
  @ApiResponse({ status: 200, type: BusTypePricingDto })
  @Get('bus-type-pricing')
  async getBusTypePricing() {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<BusTypePricingDto>>(
          { cmd: 'get_setting' },
          SettingKey.BUS_TYPE_PRICING,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update Bus Type Pricing Multipliers (Admin)' })
  @ApiBody({ type: BusTypePricingDto })
  @Patch('bus-type-pricing')
  async upsertBusTypePricing(
    @Body() dto: BusTypePricingDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<BusTypePricingDto>>(
          { cmd: 'upsert_setting' },
          { key: SettingKey.BUS_TYPE_PRICING, ...this.createPayload(dto, req) },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @ApiOperation({ summary: 'Get Global Pricing Policies (Public)' })
  @ApiResponse({ status: 200, type: PricingPoliciesDto })
  @Get('pricing-policies')
  async getPricingPolicies() {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<PricingPoliciesDto>>(
          { cmd: 'get_setting' },
          SettingKey.PRICING_POLICIES,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update Global Pricing Policies (Admin)' })
  @ApiBody({ type: PricingPoliciesDto })
  @Patch('pricing-policies')
  async upsertPricingPolicies(
    @Body() dto: PricingPoliciesDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<PricingPoliciesDto>>(
          { cmd: 'upsert_setting' },
          { key: SettingKey.PRICING_POLICIES, ...this.createPayload(dto, req) },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get Payment Gateway Configurations (Admin Only)',
    description:
      'Returns sensitive data (Secret Keys), strictly for Admin use.',
  })
  @ApiResponse({ status: 200, type: PaymentGatewaySettingsDto })
  @Get('payment-gateways')
  async getPaymentGateways() {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<PaymentGatewaySettingsDto>>(
          { cmd: 'get_setting' },
          SettingKey.PAYMENT_GATEWAYS,
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update Payment Gateway Configurations (Admin)' })
  @ApiBody({ type: PaymentGatewaySettingsDto })
  @Patch('payment-gateways')
  async upsertPaymentGateways(
    @Body() dto: PaymentGatewaySettingsDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await firstValueFrom(
        this.tripClient.send<BaseResponse<PaymentGatewaySettingsDto>>(
          { cmd: 'upsert_setting' },
          { key: SettingKey.PAYMENT_GATEWAYS, ...this.createPayload(dto, req) },
        ),
      );
    } catch (e) {
      handleRpcError(e);
    }
  }
}
