import { useFleetData } from "@/hooks/useFleetData";
import type { RiskLevel } from "@/data/mockDrivers";
import MiniTrend from "@/components/MiniTrend";
import {
  TrendingUp, TrendingDown, Clock, Moon, Zap, Gauge, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter, ZAxis, AreaChart, Area,
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
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-mono font-semibold text-foreground">{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

const DriftAnalysisPage = () => {
  const { drivers, isLoading, error } = useFleetData();

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading drift analysis...</p>
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

  // Scatter: hours drift vs aggression drift
  const scatterData = drivers.map((d) => {
    const fullName = d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.name;
    return {
      name: fullName,
      x: d.drift.drivingHoursDrift,
      y: d.drift.aggressionDrift,
      z: d.burnout.score,
      level: d.burnout.level,
    };
  });

  // Burnout score bar chart
  const barData = sorted.map((d) => {
    const fullName = d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.name;
    return {
      name: fullName.split(" ")[0],
      score: d.burnout.score,
      level: d.burnout.level,
    };
  });

  // Volatility comparison
  const volatilityData = drivers.map((d) => {
    const fullName = d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.name;
    return {
      name: fullName.split(" ")[0],
      baseline: d.baseline.stdAggressionRate,
      recent: (() => {
        const r = d.dailyMetrics.slice(-3);
        if (r.length === 0) return 0;
        const mean = r.reduce((s, m) => s + m.aggressionRate, 0) / r.length;
        const v = r.reduce((s, m) => s + Math.pow(m.aggressionRate - mean, 2), 0) / r.length;
        return +Math.sqrt(v).toFixed(2);
      })(),
    };
  });

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Drift Analysis</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Baseline vs recent · weighted scoring · volatility detection</p>
      </div>

      {/* Burnout score ranking */}
      <div className="glass-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-primary" />
          Burnout Score Ranking
        </h3>
        <p className="text-[11px] text-muted-foreground mb-4">
          Score = (Hours Drift × 0.4) + (Night Drift × 0.3) + (Aggression Drift × 0.3)
        </p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} name="Burnout Score">
                {barData.map((entry, idx) => (
                  <Cell key={idx} fill={RISK_COLORS[entry.level]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Drift breakdown per driver */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Per-Driver Drift Breakdown
          </h3>
          <div className="space-y-3 max-h-80 overflow-auto">
            {sorted.map((d) => (
              <div key={d.id} className="p-3 rounded-lg bg-secondary/30 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded text-[10px] font-semibold flex items-center justify-center"
                      style={{ backgroundColor: `${RISK_COLORS[d.burnout.level]}15`, color: RISK_COLORS[d.burnout.level] }}>
                      {d.avatar}
                    </div>
                    <span className="text-sm font-medium text-foreground">{d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.name}</span>
                  </div>
                  <span className="text-sm font-mono font-bold" style={{ color: RISK_COLORS[d.burnout.level] }}>{d.burnout.score}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Hours", icon: Clock, val: d.drift.drivingHoursDrift, color: "hsl(207, 90%, 44%)" },
                    { label: "Night", icon: Moon, val: d.drift.nightHoursDrift, color: "hsl(38, 80%, 48%)" },
                    { label: "Aggression", icon: Zap, val: d.drift.aggressionDrift, color: "hsl(15, 85%, 50%)" },
                  ].map((m) => (
                    <div key={m.label} className="text-center">
                      <div className="flex items-center justify-center gap-0.5 mb-0.5">
                        <m.icon className="w-3 h-3" style={{ color: m.color }} />
                        <span className="text-[10px] text-muted-foreground">{m.label}</span>
                      </div>
                      <span className="text-xs font-mono font-medium" style={{ color: m.color }}>
                        {m.val > 0 ? "+" : ""}{m.val}%
                      </span>
                      <div className="mt-1 h-1 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(Math.abs(m.val), 100)}%`, backgroundColor: m.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Volatility comparison */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: RISK_COLORS.high }} />
            Behavioral Volatility (Std Dev)
          </h3>
          <p className="text-[11px] text-muted-foreground mb-4">
            Baseline σ vs Recent σ of aggression rate — sharp increase = instability
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volatilityData} barGap={2} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="baseline" fill="hsl(207, 90%, 44%)" radius={[3, 3, 0, 0]} name="Baseline σ" />
                <Bar dataKey="recent" fill="hsl(0, 72%, 50%)" radius={[3, 3, 0, 0]} name="Recent σ" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "hsl(207, 90%, 44%)" }} /><span className="text-[10px] text-muted-foreground">Baseline σ (14d)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "hsl(0, 72%, 50%)" }} /><span className="text-[10px] text-muted-foreground">Recent σ (3d)</span></div>
          </div>

          {/* Volatility flags */}
          <div className="mt-4 space-y-2">
            {drivers.filter((d) => d.burnout.volatilityRising).map((d) => (
              <div key={d.id} className="flex items-center gap-2 p-2 rounded bg-destructive/5 border border-destructive/20">
                <Zap className="w-3.5 h-3.5 text-destructive" />
                <span className="text-xs text-foreground font-medium">{d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.name}</span>
                <span className="text-[10px] text-destructive font-mono ml-auto">Behavioral Instability Rising</span>
              </div>
            ))}
            {drivers.filter((d) => d.burnout.volatilityRising).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">No volatility flags currently active</p>
            )}
          </div>
        </div>
      </div>

      {/* Persistence tracking */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Consecutive Strain Day Tracking
        </h3>
        <p className="text-[11px] text-muted-foreground mb-4">
          Strain flagged when: Hours Drift &gt; 25% AND Night Drift &gt; 20% AND Aggression Drift &gt; 20% for ≥ 3 consecutive days
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {sorted.map((d) => {
            const hasPersistence = d.burnout.consecutiveDays >= 3;
            return (
              <div key={d.id} className={`p-3 rounded-lg border text-center ${hasPersistence ? "border-destructive/30 bg-destructive/5" : "border-border bg-secondary/20"}`}>
                <span className="text-sm font-medium text-foreground">{(d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.name).split(" ")[0]}</span>
                <div className="text-2xl font-bold font-mono mt-1" style={{ color: hasPersistence ? RISK_COLORS.high : RISK_COLORS.stable }}>
                  {d.burnout.consecutiveDays}
                </div>
                <span className="text-[10px] text-muted-foreground">consecutive days</span>
                {hasPersistence && <div className="text-[10px] mt-1 text-destructive font-medium">⚠ Strain flagged</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DriftAnalysisPage;
