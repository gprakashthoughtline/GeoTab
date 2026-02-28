import { useFleetData } from "@/hooks/useFleetData";
import type { RiskLevel } from "@/data/mockDrivers";
import { MessageCircle, Send, CheckCircle2, Clock, Bell, AlertTriangle } from "lucide-react";

const RISK_COLORS: Record<string, string> = {
  stable: "hsl(152, 60%, 38%)",
  mild: "hsl(38, 80%, 48%)",
  moderate: "hsl(15, 85%, 50%)",
  high: "hsl(0, 72%, 50%)",
};

const RISK_LABELS: Record<RiskLevel, string> = {
  stable: "Stable",
  mild: "Mild Strain",
  moderate: "Moderate Strain",
  high: "High Strain",
};

const NudgesPage = () => {
  const { drivers, isLoading, error } = useFleetData();

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading nudges...</p>
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

  const nudgeDrivers = [...drivers]
    .sort((a, b) => b.burnout.score - a.burnout.score);

  const notifiable = drivers.filter((d) => d.burnout.score >= 30);
  const mildNudges = drivers.filter((d) => d.burnout.score >= 15 && d.burnout.score < 30);
  const stableCount = drivers.filter((d) => d.burnout.score < 15).length;

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">AI Nudges</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Supportive, non-punitive driver notifications — triggered by behavioral drift indicators</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors">
          <Bell className="w-4 h-4" />
          Send All Pending
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="glass-card p-4 border-l-4" style={{ borderLeftColor: RISK_COLORS.high }}>
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4" style={{ color: RISK_COLORS.high }} />
            <span className="text-sm font-medium text-foreground">Push Notifications</span>
          </div>
          <p className="text-2xl font-bold font-mono mt-1" style={{ color: RISK_COLORS.high }}>{notifiable.length}</p>
          <p className="text-xs text-muted-foreground">Score ≥ 30 or 3+ day persistence</p>
        </div>
        <div className="glass-card p-4 border-l-4" style={{ borderLeftColor: RISK_COLORS.mild }}>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" style={{ color: RISK_COLORS.mild }} />
            <span className="text-sm font-medium text-foreground">Gentle Reminders</span>
          </div>
          <p className="text-2xl font-bold font-mono mt-1" style={{ color: RISK_COLORS.mild }}>{mildNudges.length}</p>
          <p className="text-xs text-muted-foreground">Score 15–30, awareness only</p>
        </div>
        <div className="glass-card p-4 border-l-4" style={{ borderLeftColor: RISK_COLORS.stable }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" style={{ color: RISK_COLORS.stable }} />
            <span className="text-sm font-medium text-foreground">No Nudge Needed</span>
          </div>
          <p className="text-2xl font-bold font-mono mt-1" style={{ color: RISK_COLORS.stable }}>{stableCount}</p>
          <p className="text-xs text-muted-foreground">Within baseline, positive reinforcement</p>
        </div>
      </div>

      {/* Nudge cards */}
      <div className="space-y-4">
        {nudgeDrivers.map((d) => {
          const shouldNotify = d.burnout.score >= 30;
          const shouldNudge = d.burnout.score >= 15;

          return (
            <div key={d.id} className="glass-card overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold"
                    style={{ backgroundColor: `${RISK_COLORS[d.burnout.level]}15`, color: RISK_COLORS[d.burnout.level] }}>
                    {d.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.name}</span>
                      <span className="text-xs font-mono text-muted-foreground">{d.id}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${RISK_COLORS[d.burnout.level]}15`, color: RISK_COLORS[d.burnout.level] }}>
                        {RISK_LABELS[d.burnout.level]} · {d.burnout.score}
                      </span>
                      {d.burnout.consecutiveDays >= 3 && (
                        <span className="text-[10px] text-destructive font-medium flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {d.burnout.consecutiveDays}d sustained
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {shouldNotify ? (
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 transition-colors">
                      <Send className="w-3 h-3" />
                      Push to Driver
                    </button>
                  ) : shouldNudge ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> Gentle reminder queued
                    </span>
                  ) : (
                    <span className="text-xs flex items-center gap-1" style={{ color: RISK_COLORS.stable }}>
                      <CheckCircle2 className="w-3 h-3" /> No nudge needed
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 bg-secondary/10">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-primary/10 shrink-0 mt-0.5">
                    <MessageCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {shouldNotify ? "🔔 Notification message:" : shouldNudge ? "💬 Gentle reminder:" : "✨ Positive reinforcement:"}
                    </p>
                    <p className="text-sm text-foreground leading-relaxed italic">"{d.nudgeMessage}"</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Safeguard reminder */}
      <div className="glass-card p-4 mt-6 border-l-4 border-l-primary">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Messaging guidelines:</strong> No mention of burnout, fatigue diagnosis, or accident prediction.
          All messages describe behavioral patterns as "driving intensity" relative to personal baseline.
        </p>
      </div>
    </div>
  );
};

export default NudgesPage;
