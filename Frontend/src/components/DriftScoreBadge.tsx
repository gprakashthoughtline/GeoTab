import type { RiskLevel } from "@/data/mockDrivers";

const RISK_LABELS: Record<RiskLevel, string> = {
  stable: "Stable",
  mild: "Mild Strain",
  moderate: "Moderate Strain",
  high: "High Strain",
};

const BADGE_CLASSES: Record<RiskLevel, string> = {
  stable: "drift-badge-low",
  mild: "drift-badge-medium",
  moderate: "drift-badge-high",
  high: "drift-badge-critical",
};

const DriftScoreBadge = ({ score, level }: { score: number; level: RiskLevel }) => (
  <div className="flex items-center gap-2">
    <div className={`px-2.5 py-1 rounded-md text-xs font-semibold font-mono ${BADGE_CLASSES[level]}`}>
      {score}
    </div>
    <span className="text-xs text-muted-foreground">{RISK_LABELS[level]}</span>
  </div>
);

export default DriftScoreBadge;
