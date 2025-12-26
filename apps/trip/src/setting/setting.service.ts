import {
  Inject,
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client-trip';
import { ClientProxy } from '@nestjs/microservices';
import { RedisCacheService } from '@app/shared';
import { SettingKey } from '@app/shared/enums';
import {
  BookingRulesSettingsDto,
  BusAmenitiesSettingsDto,
  GeneralSettingsDto,
  PaymentGatewaySettingsDto,
  BusTypePricingDto,
  PricingPoliciesDto,
} from '@app/shared/dto';

export type SettingsValueDto =
  | GeneralSettingsDto
  | BookingRulesSettingsDto
  | BusAmenitiesSettingsDto
  | PaymentGatewaySettingsDto
  | BusTypePricingDto
  | PricingPoliciesDto;

@Injectable()
export class SettingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('SUPPORT_SERVICE') private readonly supportClient: ClientProxy,
    private readonly cacheManager: RedisCacheService,
  ) {}

  private getDescriptionByKey(key: SettingKey): string {
    switch (key) {
      case SettingKey.GENERAL:
        return 'General website configuration';
      case SettingKey.BOOKING_RULES:
        return 'Booking and cancellation rules';
      case SettingKey.BUS_AMENITIES:
        return 'List of bus amenities';
      case SettingKey.PAYMENT_GATEWAYS:
        return 'Payment gateway configurations';
      case SettingKey.BUS_TYPE_PRICING:
        return 'Price multipliers based on bus type (standard, vip, etc.)';
      case SettingKey.PRICING_POLICIES:
        return 'Global pricing rules (base price/km, surcharges)';
      default:
        return 'System setting';
    }
  }

  async findOne(key: SettingKey) {
    try {
      const cacheKey = `settings:${key}`;
      const cachedData =
        await this.cacheManager.get<SettingsValueDto>(cacheKey);

      if (cachedData) {
        return {
          message: 'Fetched settings successfully (from cache)',
          data: cachedData,
        };
      }

      const setting = await this.prisma.systemSettings.findUnique({
        where: { key },
      });

      if (!setting) {
        return { message: 'Setting not found, returning default', data: null };
      }
      await this.cacheManager.set(cacheKey, setting.value, 86400);
      return { message: 'Fetched settings successfully', data: setting.value };
    } catch (err) {
      throw new InternalServerErrorException('Failed to fetch settings', {
        cause: err,
      });
    }
  }

  async upsert(
    key: SettingKey,
    value: SettingsValueDto,
    userId: string,
    ip: string,
    userAgent: string,
  ) {
    try {
      const jsonValue = value as unknown as Prisma.InputJsonValue;

      const result = await this.prisma.systemSettings.upsert({
        where: {
          key: key,
        },
        update: {
          value: jsonValue,
        },
        create: {
          key: key,
          value: jsonValue,
          description: this.getDescriptionByKey(key),
        },
      });

      await this.cacheManager.del(`settings:${key}`);
      if (
        key === SettingKey.BUS_TYPE_PRICING ||
        key === SettingKey.PRICING_POLICIES
      ) {
        await this.cacheManager.delByPattern('routes:trips:*');

        await this.cacheManager.delByPattern('trip-route-map:search:*');
      }
      this.supportClient.emit('log_activity', {
        userId: userId,
        action: 'UPSERT_SETTING',
        entityType: 'Settings',
        metadata: {
          key: key,
          update: {
            value: jsonValue,
          },
        },
        ipAddress: ip,
        userAgent: userAgent,
      });

      return { message: 'Settings saved successfully', data: result.value };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;

      throw new InternalServerErrorException('Failed to save settings', {
        cause: err,
      });
    }
  }
}
