import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { SettingKey, UserRole } from '@prisma/client';
import { SettingService } from './setting.service';
import { GeneralSettingsDto } from './dto/general-setting.dto';
import { BookingRulesSettingsDto } from './dto/booking-rule-setting.dto';
import { BusAmenitiesSettingsDto } from './dto/bus-amenities-setting.dto';
import { PaymentGatewaySettingsDto } from './dto/payment-gateway-setting.dto';
import { BusTypePricingDto } from './dto/bus-type-pricing.dto';
import { PricingPoliciesDto } from './dto/pricing-policies.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import type { RequestWithUser } from 'src/common/type/request-with-user.interface';

@ApiTags('Settings')
@Controller('settings')
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @ApiOperation({ summary: 'Get General System Settings (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Fetched general settings.',
    type: GeneralSettingsDto,
  })
  @Get('general')
  async getGeneralSettings() {
    return this.settingService.findOne(SettingKey.GENERAL);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Update General Settings' })
  @ApiBody({ type: GeneralSettingsDto })
  @ApiResponse({
    status: 200,
    description: 'General settings updated successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch('general')
  async upsertGeneral(
    @Body() dto: GeneralSettingsDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    const ip = req.ip as string;
    const userAgent = req.headers['user-agent'] as string;
    return this.settingService.upsert(
      SettingKey.GENERAL,
      dto,
      userId,
      ip,
      userAgent,
    );
  }

  @ApiOperation({ summary: 'Get Booking Rules (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Fetched booking rules.',
    type: BookingRulesSettingsDto,
  })
  @Get('booking-rules')
  async getBookingRules() {
    return this.settingService.findOne(SettingKey.BOOKING_RULES);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Update Booking Rules' })
  @ApiBody({ type: BookingRulesSettingsDto })
  @ApiResponse({
    status: 200,
    description: 'Booking rules updated successfully.',
  })
  @Patch('booking-rules')
  async upsertBookingRules(
    @Body() dto: BookingRulesSettingsDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    const ip = req.ip as string;
    const userAgent = req.headers['user-agent'] as string;
    return this.settingService.upsert(
      SettingKey.BOOKING_RULES,
      dto,
      userId,
      ip,
      userAgent,
    );
  }

  @ApiOperation({ summary: 'Get Bus Amenities List (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Fetched amenities list.',
    type: BusAmenitiesSettingsDto,
  })
  @Get('bus-amenities')
  async getBusAmenities() {
    return this.settingService.findOne(SettingKey.BUS_AMENITIES);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Update Bus Amenities List' })
  @ApiBody({ type: BusAmenitiesSettingsDto })
  @ApiResponse({
    status: 200,
    description: 'Amenities list updated successfully.',
  })
  @Patch('bus-amenities')
  async upsertBusAmenities(
    @Body() dto: BusAmenitiesSettingsDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    const ip = req.ip as string;
    const userAgent = req.headers['user-agent'] as string;
    return this.settingService.upsert(
      SettingKey.BUS_AMENITIES,
      dto,
      userId,
      ip,
      userAgent,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Get Payment Gateway Configs' })
  @ApiResponse({
    status: 200,
    description: 'Fetched payment gateway configs.',
    type: PaymentGatewaySettingsDto,
  })
  @Get('payment-gateways')
  async getPaymentGateways() {
    return this.settingService.findOne(SettingKey.PAYMENT_GATEWAYS);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Update Payment Gateway Configs' })
  @ApiBody({ type: PaymentGatewaySettingsDto })
  @ApiResponse({
    status: 200,
    description: 'Payment gateways configured successfully.',
  })
  @Patch('payment-gateways')
  async upsertPaymentGateways(
    @Body() dto: PaymentGatewaySettingsDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    const ip = req.ip as string;
    const userAgent = req.headers['user-agent'] as string;
    return this.settingService.upsert(
      SettingKey.PAYMENT_GATEWAYS,
      dto,
      userId,
      ip,
      userAgent,
    );
  }

  @ApiOperation({ summary: 'Get Bus Type Pricing Config (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Fetched pricing multipliers.',
    type: BusTypePricingDto,
  })
  @Get('bus-type-pricing')
  async getBusTypePricing() {
    return this.settingService.findOne(SettingKey.BUS_TYPE_PRICING);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Update Bus Type Pricing' })
  @ApiBody({ type: BusTypePricingDto })
  @ApiResponse({
    status: 200,
    description: 'Pricing multipliers updated successfully.',
  })
  @Patch('bus-type-pricing')
  async upsertBusTypePricing(
    @Body() dto: BusTypePricingDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    const ip = req.ip as string;
    const userAgent = req.headers['user-agent'] as string;
    return this.settingService.upsert(
      SettingKey.BUS_TYPE_PRICING,
      dto,
      userId,
      ip,
      userAgent,
    );
  }

  @ApiOperation({ summary: 'Get Pricing Policies (Public)' })
  @ApiResponse({ status: 200, type: PricingPoliciesDto })
  @Get('pricing-policies')
  async getPricingPolicies() {
    return this.settingService.findOne(SettingKey.PRICING_POLICIES);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Update Pricing Policies' })
  @ApiBody({ type: PricingPoliciesDto })
  @Patch('pricing-policies')
  async upsertPricingPolicies(
    @Body() dto: PricingPoliciesDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    const ip = req.ip as string;
    const userAgent = req.headers['user-agent'] as string;
    return this.settingService.upsert(
      SettingKey.PRICING_POLICIES,
      dto,
      userId,
      ip,
      userAgent,
    );
  }
}
