import { ApiProperty } from '@nestjs/swagger';

export class StatItemDto {
  @ApiProperty({ example: 120 })
  value: number;

  @ApiProperty({ example: 12.5, description: 'Growth percentage' })
  growth: number;
}

export class BookingStatsDto {
  @ApiProperty({ type: StatItemDto })
  totalBookings: StatItemDto;

  @ApiProperty({ type: StatItemDto })
  revenue: StatItemDto;

  @ApiProperty({ type: StatItemDto })
  cancelled: StatItemDto;
}

export class BookingStatsResponseDto {
  @ApiProperty({ example: 'Fetched booking stats successfully' })
  message: string;

  @ApiProperty({ type: BookingStatsDto })
  data: BookingStatsDto;
}

export class RevenuePointDto {
  @ApiProperty({ example: '2025-12-01', description: 'Date label' })
  date: string;

  @ApiProperty({ example: 12500000, description: 'Revenue amount' })
  revenue: number;
}

export class RevenueChartResponseDto {
  @ApiProperty({ example: 'Fetched revenue chart successfully' })
  message: string;

  @ApiProperty({ type: [RevenuePointDto] })
  data: RevenuePointDto[];
}

export class BookingTrendItemDto {
  @ApiProperty({ example: '08:00' })
  hour: string;

  @ApiProperty({ example: 42 })
  count: number;
}

export class BookingTrendsResponseDto {
  @ApiProperty({ example: 'Fetched booking trends successfully' })
  message: string;

  @ApiProperty({ type: [BookingTrendItemDto] })
  data: BookingTrendItemDto[];
}

export class OccupancyRateDto {
  @ApiProperty({ example: 72.15 })
  averageOccupancy: number;

  @ApiProperty({ example: 120 })
  totalTrips: number;
}

export class OccupancyRateResponseDto {
  @ApiProperty({ example: 'Fetched occupancy rate successfully' })
  message: string;

  @ApiProperty({ type: OccupancyRateDto })
  data: OccupancyRateDto;
}
