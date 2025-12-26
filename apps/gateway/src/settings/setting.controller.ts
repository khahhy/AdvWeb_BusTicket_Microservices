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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
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
} from '@app/shared';
import type { RequestWithUser, SettingsValueDto } from '@app/shared/type';

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
  @Get('general')
  getGeneralSettings() {
    return this.tripClient.send({ cmd: 'get_setting' }, SettingKey.GENERAL);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update General System Settings (Admin)' })
  @ApiBody({ type: GeneralSettingsDto })
  @Patch('general')
  upsertGeneral(@Body() dto: GeneralSettingsDto, @Req() req: RequestWithUser) {
    return this.tripClient.send(
      { cmd: 'upsert_setting' },
      { key: SettingKey.GENERAL, ...this.createPayload(dto, req) },
    );
  }

  @ApiOperation({ summary: 'Get Booking Rules (Public)' })
  @Get('booking-rules')
  getBookingRules() {
    return this.tripClient.send(
      { cmd: 'get_setting' },
      SettingKey.BOOKING_RULES,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update Booking Rules (Admin)' })
  @ApiBody({ type: BookingRulesSettingsDto })
  @Patch('booking-rules')
  upsertBookingRules(
    @Body() dto: BookingRulesSettingsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.tripClient.send(
      { cmd: 'upsert_setting' },
      { key: SettingKey.BOOKING_RULES, ...this.createPayload(dto, req) },
    );
  }

  @ApiOperation({ summary: 'Get List of Bus Amenities (Public)' })
  @Get('bus-amenities')
  getBusAmenities() {
    return this.tripClient.send(
      { cmd: 'get_setting' },
      SettingKey.BUS_AMENITIES,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update Bus Amenities List (Admin)' })
  @ApiBody({ type: BusAmenitiesSettingsDto })
  @Patch('bus-amenities')
  upsertBusAmenities(
    @Body() dto: BusAmenitiesSettingsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.tripClient.send(
      { cmd: 'upsert_setting' },
      { key: SettingKey.BUS_AMENITIES, ...this.createPayload(dto, req) },
    );
  }

  @ApiOperation({ summary: 'Get Bus Type Pricing Multipliers (Public)' })
  @Get('bus-type-pricing')
  getBusTypePricing() {
    return this.tripClient.send(
      { cmd: 'get_setting' },
      SettingKey.BUS_TYPE_PRICING,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update Bus Type Pricing Multipliers (Admin)' })
  @ApiBody({ type: BusTypePricingDto })
  @Patch('bus-type-pricing')
  upsertBusTypePricing(
    @Body() dto: BusTypePricingDto,
    @Req() req: RequestWithUser,
  ) {
    return this.tripClient.send(
      { cmd: 'upsert_setting' },
      { key: SettingKey.BUS_TYPE_PRICING, ...this.createPayload(dto, req) },
    );
  }

  @ApiOperation({ summary: 'Get Global Pricing Policies (Public)' })
  @Get('pricing-policies')
  getPricingPolicies() {
    return this.tripClient.send(
      { cmd: 'get_setting' },
      SettingKey.PRICING_POLICIES,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update Global Pricing Policies (Admin)' })
  @ApiBody({ type: PricingPoliciesDto })
  @Patch('pricing-policies')
  upsertPricingPolicies(
    @Body() dto: PricingPoliciesDto,
    @Req() req: RequestWithUser,
  ) {
    return this.tripClient.send(
      { cmd: 'upsert_setting' },
      { key: SettingKey.PRICING_POLICIES, ...this.createPayload(dto, req) },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get Payment Gateway Configurations (Admin Only)',
    description:
      'Returns sensitive data (Secret Keys), strictly for Admin use.',
  })
  @Get('payment-gateways')
  getPaymentGateways() {
    return this.tripClient.send(
      { cmd: 'get_setting' },
      SettingKey.PAYMENT_GATEWAYS,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update Payment Gateway Configurations (Admin)' })
  @ApiBody({ type: PaymentGatewaySettingsDto })
  @Patch('payment-gateways')
  upsertPaymentGateways(
    @Body() dto: PaymentGatewaySettingsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.tripClient.send(
      { cmd: 'upsert_setting' },
      { key: SettingKey.PAYMENT_GATEWAYS, ...this.createPayload(dto, req) },
    );
  }
}
