import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BarChart3,
  ChevronDown,
  Flame,
  GraduationCap,
  PenTool,
  RefreshCcw,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { IconBadge } from "../components/IconBadge";
import { MetricCardSkeleton } from "../components/Skeleton";
import { getUserStats } from "../lib/stats";
import { fmtRelative } from "../lib/format";

const TIMEFRAMES = [
  { value: "7d", label: "This Week" },
  { value: "30d", label: "This Month" },
  { value: "90d", label: "Last 90 Days" },
  { value: "all", label: "All Time" },
];

const TYPE_LABELS = {
  subject_verb_agreement: "Subject-Verb Agreement",
  tense: "Tense Consistency",
  article: "Articles",
  preposition: 'Prepositional Logic ("at", "in", "on")',
  word_choice: "Vocabulary Nuance",
  spelling: "Spelling",
  punctuation: "Punctuation & Run-On Sentences",
  sentence_structure: "Sentence Structure",
  other: "Other",
};

const BAR_COLORS = [
  "bg-red-500",
  "bg-amber-500",
  "bg-brand-500",
  "bg-emerald-500",
  "bg-indigo-500",
];

export function ProgressDashboard() {
  const [timeframe, setTimeframe] = useState("30d");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = async (nextTimeframe = timeframe) => {
    setLoading(true);
    setError("");
    try {
      const data = await getUserStats(nextTimeframe);
      setStats(data);
    } catch (err) {
      setError(err?.message ?? "Could not load progress stats.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats(timeframe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  const topMistakes = useMemo(() => {
    const rows = stats?.top_mistake_types ?? [];
    const max = Math.max(...rows.map((row) => row.count), 1);
    return rows.map((row, index) => ({
      ...row,
      label: TYPE_LABELS[row.type] ?? row.type,
      pct: Math.max(6, Math.round((row.count / max) * 100)),
      color: BAR_COLORS[index % BAR_COLORS.length],
    }));
  }, [stats]);

  const trend = useMemo(() => getTrend(stats?.accuracy_trend), [stats]);
  const avgMistakes =
    stats?.total_submissions > 0
      ? (stats.total_mistakes / stats.total_submissions).toFixed(1)
      : "0.0";
  const focus = topMistakes[0];

  return (
    <div className="py-5 sm:py-6 px-3 sm:px-4 md:px-6 max-w-7xl mx-auto space-y-5 sm:space-y-6">
      <Card className="p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Analyze Progress Over Time
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  trend.delta >= 0
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20"
                    : "bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20"
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                <span>{trend.label}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              See your live rate of improvement across learning segments.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold hidden sm:inline">
              Filter Period:
            </span>
            <div className="relative">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 cursor-pointer shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {TIMEFRAMES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="p-4 sm:p-5 border-red-100 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadStats(timeframe)}
              leftIcon={<RefreshCcw className="w-3.5 h-3.5" />}
            >
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {loading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              label="Drafts Polished"
              value={stats?.total_submissions ?? 0}
              icon={<PenTool className="w-6 h-6" />}
              tone="brand"
            />
            <MetricCard
              label="Average Mistakes"
              value={avgMistakes}
              sublabel="/ draft"
              icon={<Activity className="w-6 h-6" />}
              tone="red"
            />
            <MetricCard
              label="Global Accuracy Score"
              value={`${stats?.accuracy ?? 0}%`}
              sublabel={trend.delta ? trend.short : ""}
              icon={<TrendingUp className="w-6 h-6" />}
              tone="emerald"
            />
            <MetricCard
              label="Current Streak"
              value={stats?.streak_days ?? 0}
              sublabel={stats?.streak_days === 1 ? "day" : "days"}
              icon={<Flame className="w-6 h-6" />}
              tone="amber"
            />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        <Card className="lg:col-span-8 p-4 sm:p-5 lg:p-6 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Recurring Mistakes & Vulnerabilities
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                A distribution analysis of error categories logged across your
                profile history.
              </p>
            </div>
            <BarChart3 className="w-5 h-5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
          </div>

          {loading ? (
            <BarsSkeleton />
          ) : topMistakes.length > 0 ? (
            <div className="space-y-4">
              {topMistakes.map((row) => (
                <MistakeBar key={row.type} row={row} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </Card>

        <Card className="lg:col-span-4 p-4 sm:p-5 lg:p-6 space-y-5">
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Core Target Area
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              The coach recommends prioritizing this focus.
            </p>
          </div>

          <div className="p-4 bg-amber-50/50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 rounded-2xl flex items-start gap-3">
            <IconBadge tone="warning" size="sm">
              <Target className="w-4 h-4" />
            </IconBadge>
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-950 dark:text-white">
                {loading ? "Finding your focus..." : focus?.label ?? "No focus yet"}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal">
                {focus
                  ? `${focus.count} logged ${focus.count === 1 ? "mistake" : "mistakes"} point to this as your strongest practice candidate.`
                  : "Run a few writing checks and this card will identify the pattern to practice first."}
              </p>
            </div>
          </div>

          <Link to="/app/focus" className="block">
            <Button
              fullWidth
              rightIcon={<ArrowRight className="w-4 h-4" />}
              disabled={!focus && !loading}
            >
              Go to Focused Practice
            </Button>
          </Link>
        </Card>
      </div>

      <Card className="p-4 sm:p-5 lg:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Recent drafts
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Your last 5 submissions.
            </p>
          </div>
          <PenTool className="w-5 h-5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
        </div>
        {loading ? (
          <RecentSkeleton />
        ) : (stats?.recent_activity ?? []).length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            {stats.recent_activity.map((row) => (
              <RecentRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function MetricCard({ label, value, sublabel, icon, tone }) {
  return (
    <Card className="p-4 sm:p-5 lg:p-6 flex items-center justify-between gap-4">
      <div className="space-y-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {label}
        </p>
        <div className="flex items-baseline gap-1.5 min-w-0">
          <p className="text-3xl font-black text-slate-900 dark:text-white truncate">
            {value}
          </p>
          {sublabel ? (
            <span className="text-[10px] font-bold text-slate-400">
              {sublabel}
            </span>
          ) : null}
        </div>
      </div>
      <IconBadge tone={tone}>{icon}</IconBadge>
    </Card>
  );
}

function MistakeBar({ row }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-700 dark:text-slate-200 truncate">
          {row.label}
        </span>
        <span className="font-semibold text-slate-500 dark:text-slate-400 flex-shrink-0">
          {row.count} {row.count === 1 ? "error" : "errors"} logged
        </span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden">
        <div
          className={`${row.color} h-full rounded-full transition-all duration-500`}
          style={{ width: `${row.pct}%` }}
        />
      </div>
    </div>
  );
}

function BarsSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2 animate-pulse">
          <div className="flex justify-between">
            <div className="h-3 w-40 bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>
          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-10 text-center space-y-3">
      <div className="w-12 h-12 mx-auto rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/10 flex items-center justify-center">
        <BarChart3 className="w-5 h-5" />
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        No progress data yet.
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
        Analyze a draft in the Writing Desk and your recurring mistake profile
        will appear here.
      </p>
    </div>
  );
}

function getTrend(points = []) {
  const active = points.filter((point) => point.submissions > 0);
  if (active.length < 2) {
    return { delta: 0, label: "New baseline", short: "" };
  }
  const first = active[0].avg;
  const last = active[active.length - 1].avg;
  const delta = last - first;
  const sign = delta > 0 ? "+" : "";
  return {
    delta,
    label: `${sign}${delta}% accuracy ${delta >= 0 ? "gain" : "shift"}`,
    short: `${delta >= 0 ? "▲" : "▼"} ${sign}${delta}%`,
  };
}

function RecentRow({ row }) {
  const date = new Date(row.created_at);
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10 flex items-center justify-center flex-shrink-0">
        <PenTool className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 dark:text-slate-200 line-clamp-2 break-words">
          {row.snippet}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
              row.accuracy_score >= 80
                ? "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20"
                : row.accuracy_score >= 50
                ? "bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20"
                : "bg-red-50 text-red-600 border border-red-100 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20"
            }`}
          >
            {row.accuracy_score}%
          </span>
          {row.mistake_count > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
              {row.mistake_count} {row.mistake_count === 1 ? "mistake" : "mistakes"}
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20">
              Clean
            </span>
          )}
          {row.focus_area ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-brand-50 text-brand-500 border border-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/20">
              {row.focus_area}
            </span>
          ) : null}
        </div>
      </div>
      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest flex-shrink-0 text-right">
        {fmtRelative(date)}
      </div>
    </div>
  );
}

function RecentSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 p-3 animate-pulse">
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="h-2 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
