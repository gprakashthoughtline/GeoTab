// ─── Types matching the methodology ───

export type RiskLevel = "stable" | "mild" | "moderate" | "high";

/** Step 2: driver_daily_metrics */
export interface DailyMetric {
  date: string; // YYYY-MM-DD
  totalDrivingHours: number;
  totalDistance: number; // km
  nightDrivingHours: number;
  harshBrakeCount: number;
  accelerationCount: number;
  speedingCount: number;
  aggressionRate: number; // per 100km
}

/** Step 4: driver_baseline_profile (14-day rolling avg) */
export interface BaselineProfile {
  avgDrivingHours: number;
  avgNightHours: number;
  avgAggressionRate: number;
  stdAggressionRate: number; // Step 11: volatility
}

/** Step 5: Short-term window (3-day avg) */
export interface RecentWindow {
  recentDrivingHours: number;
  recentNightHours: number;
  recentAggressionRate: number;
}

/** Step 6: Drift percentages */
export interface DriftMetrics {
  drivingHoursDrift: number; // %
  nightHoursDrift: number; // %
  aggressionDrift: number; // %
}

/** Step 8: Burnout score & level */
export interface BurnoutAssessment {
  score: number;
  level: RiskLevel;
  consecutiveDays: number; // Step 7: persistence
  volatilityRising: boolean; // Step 11
}

export interface Driver {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  avatar: string;
  vehicleId: string;
  vehicleName?: string;
  route: string;
  dailyMetrics: DailyMetric[]; // last 14 days
  baseline: BaselineProfile;
  recent: RecentWindow;
  drift: DriftMetrics;
  burnout: BurnoutAssessment;
  nudgeMessage: string; // Step 9
  lastActive: string;
}
