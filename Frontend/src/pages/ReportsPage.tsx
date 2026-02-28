import { useFleetData } from "@/hooks/useFleetData";
import type { RiskLevel } from "@/data/mockDrivers";
import { FileText, Download, TrendingUp, Users, AlertTriangle, Clock, Zap } from "lucide-react";

const RISK_COLORS: Record<string, string> = {
  stable: "hsl(152, 60%, 38%)",
  mild: "hsl(38, 80%, 48%)",
  moderate: "hsl(15, 85%, 50%)",
  high: "hsl(0, 72%, 50%)",
};

const ReportsPage = () => {
  const { drivers, fleetStats, isLoading, error } = useFleetData();

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center text-destructive">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3" />
          <p className="text-sm">Failed to load data</p>
        </div>
      </div>
    );
  }

  const sorted = [...drivers].sort((a, b) => b.burnout.score - a.burnout.score);

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manager insight view — drift breakdown, trend lines, and persistence tracking</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Fleet summary */}
      <div className="glass-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Fleet Behavioral Drift Summary
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-secondary/30 rounded-lg">
            <Users className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold font-mono">{fleetStats.totalDrivers}</p>
            <p className="text-xs text-muted-foreground">Total Drivers</p>
          </div>
          <div className="text-center p-3 bg-secondary/30 rounded-lg">
            <TrendingUp className="w-5 h-5 mx-auto mb-1" style={{ color: RISK_COLORS[fleetStats.avgBurnoutScore >= 30 ? "moderate" : "mild"] }} />
            <p className="text-2xl font-bold font-mono">{fleetStats.avgBurnoutScore}</p>
            <p className="text-xs text-muted-foreground">Avg Burnout Score</p>
          </div>
          <div className="text-center p-3 bg-secondary/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 mx-auto mb-1" style={{ color: RISK_COLORS.high }} />
            <p className="text-2xl font-bold font-mono">{fleetStats.driversAtRisk}</p>
            <p className="text-xs text-muted-foreground">At Risk</p>
          </div>
          <div className="text-center p-3 bg-secondary/30 rounded-lg">
            <Zap className="w-5 h-5 mx-auto mb-1" style={{ color: RISK_COLORS.high }} />
            <p className="text-2xl font-bold font-mono">{fleetStats.volatilityAlerts}</p>
            <p className="text-xs text-muted-foreground">Volatility Alerts</p>
          </div>
        </div>
      </div>

      {/* Full driver report table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left p-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Driver</th>
              <th className="text-left p-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Vehicle</th>
              <th className="text-center p-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Baseline Hrs</th>
              <th className="text-center p-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Recent Hrs</th>
              <th className="text-center p-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Hrs Drift</th>
              <th className="text-center p-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Night Drift</th>
              <th className="text-center p-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Aggr Drift</th>
              <th className="text-center p-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Score</th>
              <th className="text-center p-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Level</th>
              <th className="text-center p-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Days</th>
              <th className="text-center p-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Volatile</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <tr key={d.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded text-[10px] font-semibold flex items-center justify-center"
                      style={{ backgroundColor: `${RISK_COLORS[d.burnout.level]}15`, color: RISK_COLORS[d.burnout.level] }}>
                      {d.avatar}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.name}</span>
                      <p className="text-[10px] text-muted-foreground font-mono">{d.id}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 font-mono text-primary text-xs">{d.vehicleId}</td>
                <td className="p-3 text-center font-mono text-xs">{d.baseline.avgDrivingHours}h</td>
                <td className="p-3 text-center font-mono text-xs">{d.recent.recentDrivingHours}h</td>
                <td className="p-3 text-center font-mono text-xs" style={{ color: d.drift.drivingHoursDrift > 25 ? RISK_COLORS.high : d.drift.drivingHoursDrift > 0 ? RISK_COLORS.mild : RISK_COLORS.stable }}>
                  {d.drift.drivingHoursDrift > 0 ? "+" : ""}{d.drift.drivingHoursDrift}%
                </td>
                <td className="p-3 text-center font-mono text-xs" style={{ color: d.drift.nightHoursDrift > 20 ? RISK_COLORS.high : d.drift.nightHoursDrift > 0 ? RISK_COLORS.mild : RISK_COLORS.stable }}>
                  {d.drift.nightHoursDrift > 0 ? "+" : ""}{d.drift.nightHoursDrift}%
                </td>
                <td className="p-3 text-center font-mono text-xs" style={{ color: d.drift.aggressionDrift > 20 ? RISK_COLORS.high : d.drift.aggressionDrift > 0 ? RISK_COLORS.mild : RISK_COLORS.stable }}>
                  {d.drift.aggressionDrift > 0 ? "+" : ""}{d.drift.aggressionDrift}%
                </td>
                <td className="p-3 text-center">
                  <span className="font-mono font-bold text-sm" style={{ color: RISK_COLORS[d.burnout.level] }}>{d.burnout.score}</span>
                </td>
                <td className="p-3 text-center">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                    style={{ backgroundColor: `${RISK_COLORS[d.burnout.level]}15`, color: RISK_COLORS[d.burnout.level] }}>
                    {d.burnout.level}
                  </span>
                </td>
                <td className="p-3 text-center font-mono text-xs">
                  {d.burnout.consecutiveDays >= 3 ? (
                    <span className="text-destructive font-medium">{d.burnout.consecutiveDays}d ⚠</span>
                  ) : (
                    <span className="text-muted-foreground">{d.burnout.consecutiveDays}d</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  {d.burnout.volatilityRising ? (
                    <span className="text-destructive text-xs">⚡ Yes</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Methodology note */}
      <div className="glass-card p-5 mt-6 border-l-4 border-l-primary">
        <h3 className="text-sm font-semibold text-foreground mb-2">Methodology</h3>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• <strong className="text-foreground">Data source:</strong> Geotab Trip (Start/Stop/DrivingDuration/Distance) + ExceptionEvent (Harsh Braking, Aggressive Acceleration, Speeding)</p>
          <p>• <strong className="text-foreground">Baseline:</strong> 14-day rolling average per driver</p>
          <p>• <strong className="text-foreground">Recent window:</strong> Last 3 days</p>
          <p>• <strong className="text-foreground">Drift:</strong> (Recent − Baseline) / Baseline × 100</p>
          <p>• <strong className="text-foreground">Score:</strong> (Hours Drift × 0.4) + (Night Drift × 0.3) + (Aggression Drift × 0.3)</p>
          <p>• <strong className="text-foreground">Strain flag:</strong> Hours &gt; 25% AND Night &gt; 20% AND Aggression &gt; 20% for ≥ 3 consecutive days</p>
          <p>• <strong className="text-foreground">Volatility:</strong> Recent σ &gt; 1.5× Baseline σ of aggression rate</p>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
