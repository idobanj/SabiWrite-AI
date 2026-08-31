import { useEffect, useState } from "react";
import { getSkillMastery } from "../lib/skillMastery";
import { Pill } from "./Pill";

/**
 * Displays adaptive skill mastery progress for a given topic.
 * Expected shape of data from the `skill-mastery` edge function:
 *   {
 *     status: "active" | "improving" | "proficient" | "reinforcement",
 *     consecutive_passes: number,
 *     required_passes: number, // typically 5
 *     last_score?: number,
 *   }
 */
export default function SkillProgress({ topic }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const result = await getSkillMastery(topic);
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        console.error("[SkillProgress] fetch error", err);
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      }
    }
    fetch();
    return () => {
      cancelled = true;
    };
  }, [topic]);

  if (loading) {
    return <div className="text-sm text-slate-400">Loading skill progress…</div>;
  }
  if (error) {
    return <div className="text-sm text-red-400">Failed to load skill progress.</div>;
  }
  if (!data) return null;

  const statusMap = {
    active: { label: "Needs Practice", tone: "amber" },
    improving: { label: "Improving", tone: "brand" },
    proficient: { label: "Proficient ✓", tone: "emerald" },
    reinforcement: { label: "Needs Reinforcement", tone: "red" },
  };
  const { label, tone } = statusMap[data.status] || statusMap.active;

  return (
    <div className="mt-2 space-y-1">
      <Pill color={tone}>{label}</Pill>
      <div className="text-xs text-slate-500">
        {data.consecutive_passes ?? 0}/{data.required_passes ?? 5} consecutive passes
      </div>
      {typeof data.last_score === "number" && (
        <div className="text-xs text-slate-500">Last score: {data.last_score}%</div>
      )}
    </div>
  );
}
