export interface TopPerformingRoute {
  routeId: string;
  routeName: string;
  origin: string | undefined;
  destination: string | undefined;
  totalBookings: number;
  totalRevenue: number | null;
}
