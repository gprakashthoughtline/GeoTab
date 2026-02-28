import { useState, Fragment } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  AlertTriangle,
  Activity,
  Users,
  Send,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  Clock,
  Gauge,
  Moon,
  Fuel,
  Wrench,
  DollarSign,
} from "lucide-react";
import { useFleetData } from "@/hooks/useFleetData";
import { useMockFleetData } from "@/hooks/useMockFleetData";
import type { RiskLevel, Driver } from "@/data/mockDrivers";
import DriftScoreBadge from "./DriftScoreBadge";
import MiniTrend from "./MiniTrend";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, RadialBarChart, RadialBar,
} from "recharts";

const filters: { label: string; value: RiskLevel | "all" }[] = [
  { label: "All", value: "all" },
  { label: "High Strain", value: "high" },
  { label: "Moderate", value: "moderate" },
  { label: "Mild", value: "mild" },
  { label: "Stable", value: "stable" },
];

const RISK_COLORS: Record<string, string> = {
  stable: "hsl(152, 60%, 38%)",
  mild: "hsl(38, 80%, 48%)",
  moderate: "hsl(15, 85%, 50%)",
  high: "hsl(0, 72%, 50%)",
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  subtitle,
  accentColor,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  subtitle?: string;
  accentColor: string;
}) => (
  <div className="glass-card p-4 relative overflow-hidden">
    <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ backgroundColor: accentColor }} />
    <div className="flex items-start justify-between pl-2">
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold mt-1 font-mono tracking-tight">{value}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${accentColor}15` }}>
        <Icon className="w-4 h-4" style={{ color: accentColor }} />
      </div>
    </div>
  </div>
);

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

const DriversPage = () => {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<RiskLevel | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"drift" | "drivers" | "mock">("drift");

  const { drivers, fleetStats, isLoading, error } = useFleetData();
  const { drivers: mockDrivers, fleetStats: mockFleetStats, isLoading: isMockLoading, error: mockError } = useMockFleetData();
  const isMockTab = activeTab === "mock";
  const activeDrivers = isMockTab ? mockDrivers : drivers;
  const activeFleetStats = isMockTab ? mockFleetStats : fleetStats;
  const activeLoading = isMockTab ? isMockLoading : isLoading;
  const activeError = isMockTab ? mockError : error;

  if (activeLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading {isMockTab ? "mock" : "drivers"}...</p>
        </div>
      </div>
    );
  }

  if (activeError) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center text-destructive">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3" />
          <p className="text-sm">Failed to load {isMockTab ? "mock" : "live"} data</p>
        </div>
      </div>
    );
  }

  const pieData = Object.entries(activeFleetStats.driftDistribution).map(([key, value]) => ({
    name: key,
    value,
    color: RISK_COLORS[key],
  }));

  // Build fleet-wide daily trend from all drivers' metrics
  const fleetDailyTrend = Array.from({ length: 14 }, (_, i) => {
    const dayScores = activeDrivers.map((d) => d.dailyMetrics[i]?.aggressionRate ?? 0);
    const avg = dayScores.length > 0 ? dayScores.reduce((a, b) => a + b, 0) / dayScores.length : 0;
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    return {
      day: date.toLocaleDateString("en", { weekday: "short" }),
      rate: +avg.toFixed(2),
    };
  });

  const filtered = activeDrivers
    .filter(
      (d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.firstName && d.firstName.toLowerCase().includes(search.toLowerCase())) ||
        (d.lastName && d.lastName.toLowerCase().includes(search.toLowerCase())) ||
        (d.firstName && d.lastName && `${d.firstName} ${d.lastName}`.toLowerCase().includes(search.toLowerCase())) ||
        (d.vehicleId && d.vehicleId.toLowerCase().includes(search.toLowerCase())) ||
        (d.vehicleName && d.vehicleName.toLowerCase().includes(search.toLowerCase())) ||
        d.id.toLowerCase().includes(search.toLowerCase())
    )
    .filter((d) => activeFilter === "all" || d.burnout.level === activeFilter);

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Burnout Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitoring {activeFleetStats.totalDrivers} drivers · {activeFleetStats.volatilityAlerts} volatility alerts
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-5">
        <button 
          onClick={() => setActiveTab("drift")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "drift" ? "text-primary border-primary" : "text-muted-foreground hover:text-foreground border-transparent"}`}
        >
          Drift Intelligence
        </button>
        <button 
          onClick={() => setActiveTab("drivers")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "drivers" ? "text-primary border-primary" : "text-muted-foreground hover:text-foreground border-transparent"}`}
        >
          Drivers
        </button>
        <button
          onClick={() => setActiveTab("mock")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "mock" ? "text-primary border-primary" : "text-muted-foreground hover:text-foreground border-transparent"}`}
        >
          Mock Data
        </button>
      </div>

      {/* Drift Intelligence Tab */}
      {(activeTab === "drift" || activeTab === "mock") && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard icon={Users} label="Total Drivers" value={activeFleetStats.totalDrivers} subtitle="Active fleet" accentColor="hsl(207, 90%, 44%)" />
            <StatCard icon={Activity} label="Avg Burnout Score" value={activeFleetStats.avgBurnoutScore} subtitle="Weighted drift score" accentColor={RISK_COLORS[activeFleetStats.avgBurnoutScore >= 30 ? "moderate" : "mild"]} />
            <StatCard icon={AlertTriangle} label="At-Risk Drivers" value={activeFleetStats.driversAtRisk} subtitle="Moderate + High strain" accentColor="hsl(15, 85%, 50%)" />
            <StatCard icon={Zap} label="Volatility Alerts" value={activeFleetStats.volatilityAlerts} subtitle="Behavioral instability rising" accentColor="hsl(0, 72%, 50%)" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Risk Distribution Donut */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Risk Distribution
          </h3>
          <p className="text-[11px] text-muted-foreground mb-3">By burnout risk level</p>
          <div className="flex items-center gap-4">
            <div className="w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-muted-foreground capitalize w-16">{d.name}</span>
                  <span className="text-xs font-mono font-semibold text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 14-Day Aggression Trend */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Fleet Aggression Rate
          </h3>
          <p className="text-[11px] text-muted-foreground mb-3">14-day avg per 100km</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fleetDailyTrend}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(207, 90%, 44%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(207, 90%, 44%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="rate" stroke="hsl(207, 90%, 44%)" strokeWidth={2} fill="url(#areaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Drift Breakdown Bar */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            Avg Drift Breakdown
          </h3>
          <p className="text-[11px] text-muted-foreground mb-3">Hours · Night · Aggression</p>
          <div className="space-y-3 mt-2">
            {[
              {
                label: "Driving Hours",
                icon: Clock,
                value: activeDrivers.length > 0 ? +(activeDrivers.reduce((s, d) => s + d.drift.drivingHoursDrift, 0) / activeDrivers.length).toFixed(1) : 0,
                color: "hsl(207, 90%, 44%)",
                weight: "40%",
              },
              {
                label: "Night Hours",
                icon: Moon,
                value: activeDrivers.length > 0 ? +(activeDrivers.reduce((s, d) => s + d.drift.nightHoursDrift, 0) / activeDrivers.length).toFixed(1) : 0,
                color: "hsl(38, 80%, 48%)",
                weight: "30%",
              },
              {
                label: "Aggression",
                icon: Zap,
                value: activeDrivers.length > 0 ? +(activeDrivers.reduce((s, d) => s + d.drift.aggressionDrift, 0) / activeDrivers.length).toFixed(1) : 0,
                color: "hsl(15, 85%, 50%)",
                weight: "30%",
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground/70">({item.weight})</span>
                  </div>
                  <span className="text-xs font-mono font-semibold" style={{ color: item.color }}>
                    {item.value > 0 ? "+" : ""}{item.value}%
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(Math.max(item.value, 0), 100)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
        </>
      )}

      {/* Drivers Tab */}
      {(activeTab === "drivers" || activeTab === "mock") && (
        <>
      <div className="mb-3">
        <span className="text-xs text-muted-foreground">
          {activeTab === "mock" ? "Demo mode: mock data (or latest 2-day live fallback)" : "Live mode: data from original collection"}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-secondary rounded-md px-3 py-2 flex-1 max-w-xs">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search drivers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
          />
        </div>
        <div className="flex gap-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-secondary text-sm text-muted-foreground rounded-md hover:text-foreground transition-colors ml-auto">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-3 mb-3">
        <span className="text-xs text-muted-foreground">
          Showing 1 – {filtered.length} of {filtered.length}
        </span>
        <div className="flex items-center gap-1">
          <button className="p-1 rounded hover:bg-secondary transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="p-1 rounded hover:bg-secondary transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="p-1 rounded hover:bg-secondary transition-colors">
            <Maximize2 className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-10">
                <input type="checkbox" className="rounded border-border" />
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Driver</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Vehicle</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Route</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Hrs Drift</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Night Drift</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Aggr. Drift</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Trend</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider text-right">Burnout Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered
              .sort((a, b) => b.burnout.score - a.burnout.score)
              .map((driver, i) => (
                <Fragment key={driver.id}>
                  <TableRow
                    className={`border-border cursor-pointer transition-colors ${expandedId === driver.id ? "bg-secondary/40" : "hover:bg-secondary/30"}`}
                    onClick={() => setExpandedId(expandedId === driver.id ? null : driver.id)}
                    style={{ animationDelay: `${0.03 * i}s` }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-border" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {/* <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0"
                          style={{
                            backgroundColor: `${RISK_COLORS[driver.burnout.level]}15`,
                            color: RISK_COLORS[driver.burnout.level],
                          }}
                        >
                          {driver.avatar}
                        </div> */}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground">
                              {driver.firstName && driver.lastName ? `${driver.firstName} ${driver.lastName}` : driver.name}
                            </span>
                            {driver.burnout.volatilityRising && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-destructive/10 text-destructive">⚡ Volatile</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{driver.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-primary font-mono">{driver.vehicleName || driver.vehicleId || 'No Vehicle'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{driver.route}</span>
                    </TableCell>
                    <TableCell>
                      <DriftCell value={driver.drift.drivingHoursDrift} threshold={25} />
                    </TableCell>
                    <TableCell>
                      <DriftCell value={driver.drift.nightHoursDrift} threshold={20} />
                    </TableCell>
                    <TableCell>
                      <DriftCell value={driver.drift.aggressionDrift} threshold={20} />
                    </TableCell>
                    <TableCell>
                      <MiniTrend
                        data={driver.dailyMetrics.map((m) => m.aggressionRate)}
                        level={driver.burnout.level}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DriftScoreBadge score={driver.burnout.score} level={driver.burnout.level} />
                    </TableCell>
                  </TableRow>

                  {/* Expanded row */}
                  {expandedId === driver.id && (
                    <TableRow className="border-border hover:bg-transparent">
                      <TableCell colSpan={9} className="p-0">
                        <ExpandedDriverDetail driver={driver} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
          </TableBody>
        </Table>
      </div>

      {filtered.length === 0 && (
        <div className="glass-card p-12 text-center mt-4">
          <p className="text-muted-foreground">No drivers match this filter.</p>
        </div>
      )}
        </>
      )}
    </div>
  );
};

// ─── Drift cell with color coding ───
const DriftCell = ({ value, threshold }: { value: number; threshold: number }) => {
  const isHigh = value > threshold;
  const isNegative = value < 0;
  const color = isHigh ? RISK_COLORS.high : isNegative ? RISK_COLORS.stable : RISK_COLORS.mild;
  return (
    <div className="flex items-center gap-1">
      {value > 0 ? <TrendingUp className="w-3 h-3" style={{ color }} /> : <TrendingDown className="w-3 h-3" style={{ color }} />}
      <span className="text-sm font-mono font-medium" style={{ color }}>
        {value > 0 ? "+" : ""}{value}%
      </span>
    </div>
  );
};

// ─── Expanded driver detail ───
const ExpandedDriverDetail = ({ driver }: { driver: Driver }) => {
  const { baseline, recent, drift, burnout, dailyMetrics } = driver;

  const comparisonData = [
    {
      label: "Driving Hours",
      icon: Clock,
      baseline: baseline.avgDrivingHours,
      recent: recent.recentDrivingHours,
      drift: drift.drivingHoursDrift,
      unit: "hrs/day",
      weight: "40%",
    },
    {
      label: "Night Driving",
      icon: Moon,
      baseline: baseline.avgNightHours,
      recent: recent.recentNightHours,
      drift: drift.nightHoursDrift,
      unit: "hrs/day",
      weight: "30%",
    },
    {
      label: "Aggression Rate",
      icon: Zap,
      baseline: baseline.avgAggressionRate,
      recent: recent.recentAggressionRate,
      drift: drift.aggressionDrift,
      unit: "per 100km",
      weight: "30%",
    },
  ];

  // Recent 7 days metrics for mini chart
  const recentDays = dailyMetrics.slice(-7).map((m) => ({
    date: m.date.slice(5),
    harsh: m.harshBrakeCount,
    accel: m.accelerationCount,
    speeding: m.speedingCount,
  }));

  return (
    <div className="bg-secondary/20 border-t border-border p-5 space-y-5 animate-fade-in">
      {/* Baseline vs Recent comparison */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          14-Day Baseline vs 3-Day Recent · Drift %
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {comparisonData.map((item) => {
            const isUp = item.drift > 0;
            const color = Math.abs(item.drift) > 25 ? RISK_COLORS.high : isUp ? RISK_COLORS.moderate : RISK_COLORS.stable;
            return (
              <div key={item.label} className="bg-card rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <item.icon className="w-4 h-4" style={{ color }} />
                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground">({item.weight})</span>
                  </div>
                  <span className="text-xs font-mono font-bold" style={{ color }}>
                    {isUp ? "+" : ""}{item.drift}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Baseline (14d)</p>
                    <p className="text-sm font-mono font-semibold text-foreground">{item.baseline} <span className="text-muted-foreground text-[10px]">{item.unit}</span></p>
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Recent (3d)</p>
                    <p className="text-sm font-mono font-semibold" style={{ color }}>{item.recent} <span className="text-muted-foreground text-[10px]">{item.unit}</span></p>
                  </div>
                </div>
                {/* Drift bar */}
                <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(Math.abs(item.drift), 100)}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event breakdown chart + Score */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 7-day event breakdown */}
        <div className="bg-card rounded-lg p-4 border border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Exception Events (7 Days)
          </h4>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recentDays} barSize={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="harsh" stackId="a" fill={RISK_COLORS.high} radius={[0, 0, 0, 0]} name="Harsh Braking" />
                <Bar dataKey="accel" stackId="a" fill={RISK_COLORS.moderate} name="Acceleration" />
                <Bar dataKey="speeding" stackId="a" fill={RISK_COLORS.mild} radius={[2, 2, 0, 0]} name="Speeding" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RISK_COLORS.high }} /><span className="text-[10px] text-muted-foreground">Harsh Braking</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RISK_COLORS.moderate }} /><span className="text-[10px] text-muted-foreground">Acceleration</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RISK_COLORS.mild }} /><span className="text-[10px] text-muted-foreground">Speeding</span></div>
          </div>
        </div>

        {/* Burnout score card */}
        <div className="bg-card rounded-lg p-4 border border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Burnout Score · Weighted Formula
          </h4>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold font-mono" style={{ color: RISK_COLORS[burnout.level] }}>
                {burnout.score}
              </div>
              <div className="text-xs font-medium capitalize mt-1" style={{ color: RISK_COLORS[burnout.level] }}>
                {burnout.level === "stable" ? "Stable" : burnout.level === "mild" ? "Mild Strain" : burnout.level === "moderate" ? "Moderate Strain" : "High Strain"}
              </div>
            </div>
            <div className="flex-1 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hours drift × 0.4</span>
                <span className="font-mono font-medium text-foreground">{(drift.drivingHoursDrift * 0.4).toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Night drift × 0.3</span>
                <span className="font-mono font-medium text-foreground">{(drift.nightHoursDrift * 0.3).toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aggression drift × 0.3</span>
                <span className="font-mono font-medium text-foreground">{(drift.aggressionDrift * 0.3).toFixed(1)}</span>
              </div>
              <div className="border-t border-border pt-1 flex justify-between font-semibold">
                <span className="text-muted-foreground">Total</span>
                <span className="font-mono" style={{ color: RISK_COLORS[burnout.level] }}>{burnout.score}</span>
              </div>
            </div>
          </div>

          {/* Persistence & Volatility flags */}
          <div className="flex gap-2 mt-3">
            {burnout.consecutiveDays >= 3 && (
              <span className="text-[10px] px-2 py-1 rounded-full font-medium bg-destructive/10 text-destructive">
                ⚠ Pattern sustained {burnout.consecutiveDays} days
              </span>
            )}
            {burnout.volatilityRising && (
              <span className="text-[10px] px-2 py-1 rounded-full font-medium bg-destructive/10 text-destructive">
                ⚡ Behavioral Instability Rising
              </span>
            )}
            {burnout.level === "stable" && (
              <span className="text-[10px] px-2 py-1 rounded-full font-medium bg-success/10 text-success">
                ✓ Within baseline
              </span>
            )}
          </div>
        </div>
      </div>

      {/* AI Nudge */}
      {burnout.score >= 15 && (
        <div className="rounded-lg bg-accent/50 border border-primary/20 p-4">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-md bg-primary/10 shrink-0 mt-0.5">
              <MessageCircle className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-primary">Behavioral Drift Indicator</span>
                <span className="text-xs text-muted-foreground">• Supportive, non-punitive</span>
              </div>
              <p className="text-sm text-accent-foreground leading-relaxed">{driver.nudgeMessage}</p>
              {burnout.score >= 30 && (
                <button className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                  <Send className="w-3 h-3" />
                  Push notification to driver
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriversPage;
