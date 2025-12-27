export interface StatItem {
  value: number;
  growth: number;
}

export interface UserStatsData {
  total: StatItem;
  newThisMonth: StatItem;
  active: StatItem;
}
