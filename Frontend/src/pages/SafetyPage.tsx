import { useFleetData } from "@/hooks/useFleetData";
import type { RiskLevel } from "@/data/mockDrivers";
import {
  Shield, AlertTriangle, Zap, TrendingDown, CheckCircle2,
} from "lucide-react";
import {
  BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
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

const SafetyPage = () => {
  const { drivers, isLoading, error } = useFleetData();

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading safety data...</p>
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
  const highRisk = drivers.filter((d) => d.burnout.level === "high");
  const moderateRisk = drivers.filter((d) => d.burnout.level === "moderate");
  const stableDrivers = drivers.filter((d) => d.burnout.level === "stable");

  // Aggression events bar
  const eventData = sorted.map((d) => {
    const last3 = d.dailyMetrics.slice(-3);
    const fullName = d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.name;
    return {
      name: fullName.split(" ")[0],
      harsh: last3.reduce((s, m) => s + m.harshBrakeCount, 0),
      accel: last3.reduce((s, m) => s + m.accelerationCount, 0),
      speeding: last3.reduce((s, m) => s + m.speedingCount, 0),
    };
  });

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Safety Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Exception events from Geotab · Harsh braking, aggressive acceleration, speeding</p>
      </div>

      {/* Safety summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="glass-card p-4 border-l-4" style={{ borderLeftColor: RISK_COLORS.high }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" style={{ color: RISK_COLORS.high }} />
            <span className="text-sm font-semibold text-foreground">High Strain</span>
          </div>
          <p className="text-3xl font-bold font-mono" style={{ color: RISK_COLORS.high }}>{highRisk.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Drivers with burnout score ≥ 50</p>
          {highRisk.map((d) => (
            <div key={d.id} className="mt-2 text-xs flex justify-between">
              <span className="text-foreground">{d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.name}</span>
              <span className="font-mono" style={{ color: RISK_COLORS.high }}>{d.burnout.score}</span>
            </div>
          ))}
        </div>
        <div className="glass-card p-4 border-l-4" style={{ borderLeftColor: RISK_COLORS.moderate }}>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4" style={{ color: RISK_COLORS.moderate }} />
            <span className="text-sm font-semibold text-foreground">Moderate Strain</span>
          </div>
          <p className="text-3xl font-bold font-mono" style={{ color: RISK_COLORS.moderate }}>{moderateRisk.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Score 30–50, monitor closely</p>
          {moderateRisk.map((d) => (
            <div key={d.id} className="mt-2 text-xs flex justify-between">
              <span className="text-foreground">{d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.name}</span>
              <span className="font-mono" style={{ color: RISK_COLORS.moderate }}>{d.burnout.score}</span>
            </div>
          ))}
        </div>
        <div className="glass-card p-4 border-l-4" style={{ borderLeftColor: RISK_COLORS.stable }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4" style={{ color: RISK_COLORS.stable }} />
            <span className="text-sm font-semibold text-foreground">Stable</span>
          </div>
          <p className="text-3xl font-bold font-mono" style={{ color: RISK_COLORS.stable }}>{stableDrivers.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Within personal baseline</p>
        </div>
      </div>

      {/* Exception events stacked bar */}
      <div className="glass-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Exception Events (Last 3 Days)
        </h3>
        <p className="text-[11px] text-muted-foreground mb-4">Harsh braking · Aggressive acceleration · Speeding — sourced from Geotab ExceptionEvent</p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={eventData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="harsh" stackId="a" fill={RISK_COLORS.high} name="Harsh Braking" />
              <Bar dataKey="accel" stackId="a" fill={RISK_COLORS.moderate} name="Acceleration" />
              <Bar dataKey="speeding" stackId="a" fill={RISK_COLORS.mild} radius={[3, 3, 0, 0]} name="Speeding" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RISK_COLORS.high }} /><span className="text-[10px] text-muted-foreground">Harsh Braking</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RISK_COLORS.moderate }} /><span className="text-[10px] text-muted-foreground">Acceleration</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RISK_COLORS.mild }} /><span className="text-[10px] text-muted-foreground">Speeding</span></div>
        </div>
      </div>

      {/* Safeguards notice */}
      <div className="glass-card p-5 border-l-4 border-l-primary">
        <h3 className="text-sm font-semibold text-foreground mb-2">⚠ Safeguards</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>• All indicators are labeled as <strong className="text-foreground">Behavioral Drift Indicators</strong> — never medical diagnoses</li>
          <li>• System does not diagnose fatigue, claim mental health detection, or predict accidents</li>
          <li>• Driver notifications are supportive and non-punitive</li>
          <li>• Scores reflect deviation from personal baseline, not absolute thresholds</li>
        </ul>
      </div>
    </div>
  );
};

export default SafetyPage;
