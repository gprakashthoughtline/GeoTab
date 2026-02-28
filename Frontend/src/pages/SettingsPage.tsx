import { Settings, Info, Sliders, Bell, Shield } from "lucide-react";

const SettingsPage = () => (
  <div className="flex-1 p-6 overflow-auto">
    <div className="mb-6">
      <h1 className="text-xl font-bold text-foreground">Settings</h1>
      <p className="text-sm text-muted-foreground mt-0.5">Configure drift thresholds, notification rules, and data sources</p>
    </div>

    <div className="space-y-6 max-w-2xl">
      {/* Drift thresholds */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-primary" />
          Drift Thresholds
        </h3>
        <div className="space-y-4">
          {[
            { label: "Driving Hours Drift Threshold", value: "25%", desc: "Flags when recent avg exceeds baseline by this %" },
            { label: "Night Driving Drift Threshold", value: "20%", desc: "Night shift increase detection sensitivity" },
            { label: "Aggression Rate Drift Threshold", value: "20%", desc: "Events per 100km deviation threshold" },
          ].map((t) => (
            <div key={t.label} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <div>
                <span className="text-sm font-medium text-foreground">{t.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="text" defaultValue={t.value} className="w-16 text-center text-sm font-mono bg-card border border-border rounded-md px-2 py-1 text-foreground" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score weights */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          Burnout Score Weights
        </h3>
        <div className="space-y-3">
          {[
            { label: "Driving Hours Weight", value: "0.4" },
            { label: "Night Driving Weight", value: "0.3" },
            { label: "Aggression Weight", value: "0.3" },
          ].map((w) => (
            <div key={w.label} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <span className="text-sm font-medium text-foreground">{w.label}</span>
              <input type="text" defaultValue={w.value} className="w-16 text-center text-sm font-mono bg-card border border-border rounded-md px-2 py-1 text-foreground" />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">Weights must sum to 1.0</p>
      </div>

      {/* Notification rules */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          Notification Rules
        </h3>
        <div className="space-y-3">
          {[
            { label: "Push notification threshold", value: "Score ≥ 30", checked: true },
            { label: "Consecutive days before flag", value: "3 days", checked: true },
            { label: "Volatility alert", value: "σ > 1.5× baseline", checked: true },
            { label: "Auto-send nudges", value: "Manual approval", checked: false },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <div>
                <span className="text-sm font-medium text-foreground">{r.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{r.value}</p>
              </div>
              <div className="w-10 h-5 rounded-full relative cursor-pointer" style={{ backgroundColor: r.checked ? "hsl(207, 90%, 44%)" : "hsl(214, 20%, 88%)" }}>
                <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: r.checked ? "22px" : "2px" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data source */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          Data Source Configuration
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-secondary/30 rounded-lg">
            <span className="text-sm font-medium text-foreground">Geotab API</span>
            <p className="text-xs text-muted-foreground mt-0.5">Trip (Start, Stop, DrivingDuration, Distance) + ExceptionEvent (Harsh Braking, Aggressive Acceleration, Speeding)</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">Connected</span>
              <span className="text-[10px] text-muted-foreground">Last sync: 2 hours ago</span>
            </div>
          </div>
          <div className="p-3 bg-secondary/30 rounded-lg">
            <span className="text-sm font-medium text-foreground">Aggregation Schedule</span>
            <p className="text-xs text-muted-foreground mt-0.5">Daily at 02:00 UTC — aggregates previous day's data into driver_daily_metrics</p>
          </div>
          <div className="p-3 bg-secondary/30 rounded-lg">
            <span className="text-sm font-medium text-foreground">Baseline Window</span>
            <p className="text-xs text-muted-foreground mt-0.5">14-day rolling average · Recent window: 3 days</p>
          </div>
        </div>
      </div>

      {/* Safeguards */}
      <div className="glass-card p-5 border-l-4 border-l-primary">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Safeguards
        </h3>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• All outputs labeled as "Behavioral Drift Indicators"</li>
          <li>• No fatigue diagnosis, mental health claims, or accident predictions</li>
          <li>• Driver messages are supportive and non-punitive</li>
          <li>• Scores reflect personal deviation, not absolute thresholds</li>
        </ul>
      </div>
    </div>
  </div>
);

export default SettingsPage;
