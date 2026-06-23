import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  GraduationCap,
  PenTool,
} from "lucide-react";
import { Card } from "../components/Card";
import { Pill } from "../components/Pill";
import { StatCard } from "../components/StatCard";

/** Phase 4 placeholder. Real stats computed from analysis_logs + mistakes. */
export function ProgressDashboard() {
  return (
    <div className="py-6 px-6 max-w-7xl mx-auto space-y-8">
      <Card>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-500 rounded-2xl dark:bg-indigo-500/10">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
              Progress Stats
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Recurring mistakes and improvement trend.
            </p>
          </div>
          <Pill color="amber" className="ml-auto">
            Phase 4
          </Pill>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-4 mt-4">
          In Phase 4 this dashboard will be powered by a SQL aggregation over
          the <code>analysis_logs</code> and <code>mistakes</code> tables,
          called via the <code>user-stats</code> Edge Function.
        </p>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 opacity-60">
        <StatCard
          label="Drafts Polished"
          value="—"
          icon={<PenTool className="w-6 h-6" />}
          tone="brand"
        />
        <StatCard
          label="Avg Error Density"
          value="—"
          sublabel="/ 100 words"
          icon={<AlertCircle className="w-6 h-6" />}
          tone="red"
        />
        <StatCard
          label="Global Accuracy"
          value="—"
          icon={<TrendingUp className="w-6 h-6" />}
          tone="emerald"
        />
        <StatCard
          label="Modules Completed"
          value="—"
          icon={<GraduationCap className="w-6 h-6" />}
          tone="indigo"
        />
      </div>
    </div>
  );
}
