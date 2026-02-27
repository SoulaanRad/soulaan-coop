"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, XCircle } from "lucide-react";

interface ScoreBarProps {
  label: string;
  value: number;
  subtitle?: string;
}

function ScoreBar({ label, value, subtitle }: ScoreBarProps) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <div>
          <span className="text-gray-300">{label}</span>
          {subtitle && <span className="text-gray-500 text-xs ml-1">({subtitle})</span>}
        </div>
        <span className="text-white font-medium">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface StructuralScores {
  goal_mapping_valid: boolean;
  feasibility_score: number;
  risk_score: number;
  accountability_score: number;
}

interface MissionImpactScore {
  goal_id: string;
  impact_score: number;
  goal_priority_weight: number;
}

interface ComputedScores {
  mission_weighted_score: number;
  structural_weighted_score: number;
  overall_score: number;
  passes_threshold: boolean;
}

interface Evaluation {
  structural_scores: StructuralScores;
  mission_impact_scores: MissionImpactScore[];
  computed_scores: ComputedScores;
  violations?: string[];
  risk_flags?: string[];
  llm_summary?: string;
}

interface GoalScoreRecord {
  goalId: string;
  domain: string;
  aiScore: number;
  expertScore: number | null;
  finalScore: number;
  expertWallet?: string | null;
  expertReason?: string | null;
}

interface ProposalScoresProps {
  evaluation: Evaluation;
  goalScores?: GoalScoreRecord[];
}

export function ProposalScores({ evaluation, goalScores }: ProposalScoresProps) {
  const goalScoreMap = new Map((goalScores ?? []).map(gs => [gs.goalId, gs]));
  const [showRiskFlags, setShowRiskFlags] = useState(false);
  const [showViolations, setShowViolations] = useState(false);

  const { structural_scores, mission_impact_scores, computed_scores, violations = [], risk_flags = [], llm_summary } = evaluation;
  const overall = computed_scores.overall_score;
  const overallPct = Math.round(overall * 100);
  const passes = computed_scores.passes_threshold;

  return (
    <div className="space-y-5">
      {/* Overall */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-700">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Overall Score</p>
          <p className="text-3xl font-bold text-white mt-0.5">{overallPct}%</p>
          {llm_summary && <p className="text-xs text-gray-400 mt-1 max-w-xs">{llm_summary}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          {(computed_scores as any).expert_adjusted && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 mb-1">
              ★ Expert adjusted
            </span>
          )}
          {passes ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-500/20 text-green-400">
              <CheckCircle2 className="h-3 w-3" /> Passed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-red-500/20 text-red-400">
              <XCircle className="h-3 w-3" /> Below Threshold
            </span>
          )}
        </div>
      </div>

      {/* Structural */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Structural</h3>
          <span className="text-xs text-gray-500">{Math.round(computed_scores.structural_weighted_score * 100)}% weighted</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {structural_scores.goal_mapping_valid ? (
            <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          )}
          <span className={structural_scores.goal_mapping_valid ? "text-green-400" : "text-red-400"}>
            Goal mapping {structural_scores.goal_mapping_valid ? "valid" : "invalid"}
          </span>
        </div>
        <ScoreBar label="Feasibility" value={structural_scores.feasibility_score} />
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Risk</span>
            <span className="text-white font-medium">{Math.round(structural_scores.risk_score * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${structural_scores.risk_score >= 0.7 ? "bg-red-500" : structural_scores.risk_score >= 0.4 ? "bg-amber-500" : "bg-green-500"}`}
              style={{ width: `${Math.round(structural_scores.risk_score * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">Lower is better — higher values indicate greater risk</p>
        </div>
        <ScoreBar label="Accountability" value={structural_scores.accountability_score} />
      </div>

      {/* Mission Impact */}
      {mission_impact_scores.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Mission Impact</h3>
            <span className="text-xs text-gray-500">{Math.round(computed_scores.mission_weighted_score * 100)}% weighted</span>
          </div>
          {mission_impact_scores.map((s) => {
            const gs = goalScoreMap.get(s.goal_id);
            const hasExpert = gs?.expertScore != null;
            return (
              <div key={s.goal_id} className="space-y-1">
                <ScoreBar
                  label={s.goal_id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  value={gs?.finalScore ?? s.impact_score}
                  subtitle={`${Math.round(s.goal_priority_weight * 100)}% weight${gs ? ` · ${gs.domain}` : ""}`}
                />
                {gs && (
                  <div className="flex items-center gap-3 text-xs mt-0.5 pl-0.5">
                    <span className="text-gray-500">AI: <span className="text-blue-400">{Math.round(gs.aiScore * 100)}%</span></span>
                    {hasExpert && (
                      <>
                        <span className="text-gray-600">→</span>
                        <span className="text-gray-500">Expert: <span className="text-amber-400">{Math.round(gs.expertScore! * 100)}%</span></span>
                      </>
                    )}
                    <span className={`font-medium ${hasExpert ? "text-amber-300" : "text-gray-400"}`}>
                      Final: {Math.round((gs.finalScore) * 100)}%
                    </span>
                  </div>
                )}
                {s.score_reason && (
                  <p className="text-xs text-gray-500 leading-relaxed pl-0.5 italic">
                    {s.score_reason}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Risk Flags */}
      {risk_flags.length > 0 && (
        <div className="pt-2 border-t border-slate-700">
          <button
            onClick={() => setShowRiskFlags(!showRiskFlags)}
            className="flex items-center justify-between w-full text-sm font-medium text-amber-400 hover:text-amber-300"
          >
            <span>Risk Flags ({risk_flags.length})</span>
            {showRiskFlags ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showRiskFlags && (
            <ul className="mt-2 space-y-1">
              {risk_flags.map((flag, i) => (
                <li key={i} className="text-xs text-amber-300 flex items-start gap-1">
                  <span className="mt-0.5">•</span> {flag}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Violations */}
      {violations.length > 0 && (
        <div className="pt-2 border-t border-slate-700">
          <button
            onClick={() => setShowViolations(!showViolations)}
            className="flex items-center justify-between w-full text-sm font-medium text-red-400 hover:text-red-300"
          >
            <span>Violations ({violations.length})</span>
            {showViolations ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showViolations && (
            <ul className="mt-2 space-y-1">
              {violations.map((v, i) => (
                <li key={i} className="text-xs text-red-300 flex items-start gap-1">
                  <span className="mt-0.5">•</span> {v}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
