import { SettingKey } from '@app/shared/enums';
import {
  BookingRulesSettingsDto,
  GeneralSettingsDto,
  BusAmenitiesSettingsDto,
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

export interface UpsertSettingPayload<T = SettingsValueDto> {
  key: SettingKey;
  dto: T;
  userId: string;
  ip: string;
  userAgent: string;
}
