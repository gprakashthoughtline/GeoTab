import { useState } from "react";
import {
  Activity, Users, AlertTriangle, Zap, Shield, TrendingUp, Clock, Moon, RotateCcw,
} from "lucide-react";
import { useFleetData } from "@/hooks/useFleetData";
import type { RiskLevel } from "@/data/mockDrivers";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";

const RISK_COLORS: Record<string, string> = {
  stable: "hsl(152, 60%, 38%)",
  mild: "hsl(38, 80%, 48%)",
  moderate: "hsl(15, 85%, 50%)",
  high: "hsl(0, 72%, 50%)",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-md">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-mono font-semibold text-foreground">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const StatCard = ({ icon: Icon, label, value, subtitle, color }: {
  icon: typeof Activity; label: string; value: string | number; subtitle: string; color: string;
}) => (
  <div className="glass-card p-4 relative overflow-hidden">
    <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ backgroundColor: color }} />
    <div className="flex items-start justify-between pl-2">
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold mt-1 font-mono tracking-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
    </div>
  </div>
);

const DashboardPage = () => {
  const { drivers, fleetStats, isLoading, error } = useFleetData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // Reload the page to show fresh data
        window.location.reload();
      } else {
        console.error('Refresh failed');
      }
    } catch (error) {
      console.error('Refresh error:', error);
    }
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading fleet data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center text-destructive">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3" />
          <p className="text-sm">Failed to load fleet data</p>
          <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  const pieData = Object.entries(fleetStats.driftDistribution).map(([key, value]) => ({
    name: key, value, color: RISK_COLORS[key],
  }));

  const fleetDailyTrend = Array.from({ length: 14 }, (_, i) => {
    const scores = drivers.map((d) => d.dailyMetrics[i]?.aggressionRate ?? 0);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    return { day: date.toLocaleDateString("en", { month: "short", day: "numeric" }), rate: +avg.toFixed(2) };
  });

  const hoursTrend = Array.from({ length: 14 }, (_, i) => {
    const hrs = drivers.map((d) => d.dailyMetrics[i]?.totalDrivingHours ?? 0);
    const avg = hrs.length > 0 ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0;
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    return { day: date.toLocaleDateString("en", { month: "short", day: "numeric" }), hours: +avg.toFixed(1) };
  });

  const atRiskDrivers = drivers.filter((d) => d.burnout.level === "high" || d.burnout.level === "moderate");

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fleet behavioral drift overview</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="Total Drivers" value={fleetStats.totalDrivers} subtitle="Active fleet" color="hsl(207, 90%, 44%)" />
        <StatCard icon={Activity} label="Avg Burnout Score" value={fleetStats.avgBurnoutScore} subtitle="Weighted drift" color={RISK_COLORS[fleetStats.avgBurnoutScore >= 30 ? "moderate" : "mild"]} />
        <StatCard icon={AlertTriangle} label="At-Risk Drivers" value={fleetStats.driversAtRisk} subtitle="Moderate + High" color="hsl(15, 85%, 50%)" />
        <StatCard icon={Zap} label="Volatility Alerts" value={fleetStats.volatilityAlerts} subtitle="Instability rising" color="hsl(0, 72%, 50%)" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Risk distribution */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Risk Distribution
          </h3>
          <p className="text-[11px] text-muted-foreground mb-3">By strain level</p>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {pieData.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-muted-foreground capitalize w-16">{d.name}</span>
                  <span className="text-xs font-mono font-semibold text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Aggression trend */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Fleet Aggression Rate
          </h3>
          <p className="text-[11px] text-muted-foreground mb-3">14-day avg per 100km</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fleetDailyTrend}>
                <defs>
                  <linearGradient id="aggrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(15, 85%, 50%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(15, 85%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="rate" stroke="hsl(15, 85%, 50%)" strokeWidth={2} fill="url(#aggrGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Driving hours trend */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Avg Driving Hours
          </h3>
          <p className="text-[11px] text-muted-foreground mb-3">14-day fleet average</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hoursTrend}>
                <defs>
                  <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(207, 90%, 44%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(207, 90%, 44%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="hours" stroke="hsl(207, 90%, 44%)" strokeWidth={2} fill="url(#hoursGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* At-risk drivers quick list */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" style={{ color: RISK_COLORS.high }} />
          At-Risk Drivers — Requires Attention
        </h3>
        <div className="space-y-3">
          {atRiskDrivers.sort((a, b) => b.burnout.score - a.burnout.score).map((d) => (
            <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold"
                  style={{ backgroundColor: `${RISK_COLORS[d.burnout.level]}15`, color: RISK_COLORS[d.burnout.level] }}>
                  {d.avatar}
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">
                    {d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.name}
                  </span>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-[11px] text-muted-foreground font-mono">{d.id}</span>
                    <span className="text-[11px] text-muted-foreground">{d.route}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Drift</div>
                  <div className="flex gap-2 text-xs font-mono">
                    <span style={{ color: RISK_COLORS.moderate }}>H:{d.drift.drivingHoursDrift > 0 ? "+" : ""}{d.drift.drivingHoursDrift}%</span>
                    <span style={{ color: RISK_COLORS.mild }}>N:{d.drift.nightHoursDrift > 0 ? "+" : ""}{d.drift.nightHoursDrift}%</span>
                    <span style={{ color: RISK_COLORS.high }}>A:{d.drift.aggressionDrift > 0 ? "+" : ""}{d.drift.aggressionDrift}%</span>
                  </div>
                </div>
                <div className="text-center min-w-[60px]">
                  <div className="text-lg font-bold font-mono" style={{ color: RISK_COLORS[d.burnout.level] }}>{d.burnout.score}</div>
                  <div className="text-[10px] capitalize" style={{ color: RISK_COLORS[d.burnout.level] }}>
                    {d.burnout.level} strain
                  </div>
                </div>
                {d.burnout.consecutiveDays >= 3 && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
                    {d.burnout.consecutiveDays}d sustained
                  </span>
                )}
              </div>
            </div>
          ))}
          {atRiskDrivers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No drivers currently at risk. Fleet is stable.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
