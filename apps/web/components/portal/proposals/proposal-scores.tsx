"use client";

interface ScoreBarProps {
  label: string;
  value: number;
  maxValue?: number;
}

function ScoreBar({ label, value, maxValue = 1 }: ScoreBarProps) {
  const pct = Math.round((value / maxValue) * 100);
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface ProposalScoresProps {
  scores: { alignment: number; feasibility: number; composite: number };
  goalScores?: {
    LeakageReduction: number;
    MemberBenefit: number;
    EquityGrowth: number;
    LocalJobs: number;
    CommunityVitality: number;
    Resilience: number;
    composite: number;
  } | null;
}

export function ProposalScores({ scores, goalScores }: ProposalScoresProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">AI Scores</h3>
        <ScoreBar label="Alignment" value={scores.alignment} />
        <ScoreBar label="Feasibility" value={scores.feasibility} />
        <ScoreBar label="Composite" value={scores.composite} />
      </div>

      {goalScores && (
        <div className="space-y-3 pt-2 border-t border-slate-700">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Charter Goals</h3>
          <ScoreBar label="Leakage Reduction" value={goalScores.LeakageReduction} />
          <ScoreBar label="Member Benefit" value={goalScores.MemberBenefit} />
          <ScoreBar label="Equity Growth" value={goalScores.EquityGrowth} />
          <ScoreBar label="Local Jobs" value={goalScores.LocalJobs} />
          <ScoreBar label="Community Vitality" value={goalScores.CommunityVitality} />
          <ScoreBar label="Resilience" value={goalScores.Resilience} />
        </div>
      )}
    </div>
  );
}
