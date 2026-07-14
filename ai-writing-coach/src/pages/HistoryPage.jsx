import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  History,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Pill } from "../components/Pill";
import { IconBadge } from "../components/IconBadge";
import { useToast } from "../components/Toast";
import { getHistoryPage, getHistoryTopics } from "../lib/history";

const PAGE_SIZE = 25;

function accuracyTone(score) {
  if (score >= 80) return "emerald";
  if (score >= 50) return "amber";
  return "red";
}

function accuracyPillColor(score) {
  if (score >= 80) return "emerald";
  if (score >= 50) return "amber";
  return "red";
}

/**
 * Phase 4: History page. Lists every analysis_logs row for the current user
 * with a search filter, topic filter, infinite-scroll "Load more", and an
 * expandable detail row showing the original vs corrected text.
 */
export function HistoryPage() {
  const { show } = useToast();

  const [entries, setEntries] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const [topics, setTopics] = useState([]);

  const [expanded, setExpanded] = useState(null); // id of currently expanded row

  // First load: history + topic list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [page, allTopics] = await Promise.all([
          getHistoryPage({ pageSize: PAGE_SIZE }),
          getHistoryTopics(),
        ]);
        if (cancelled) return;
        setEntries(page.entries);
        setCursor(page.nextCursor);
        setDone(page.nextCursor === null);
        setTopics(allTopics);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message ?? "Couldn't load your history.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || done || !cursor) return;
    setLoadingMore(true);
    try {
      const page = await getHistoryPage({ cursor, pageSize: PAGE_SIZE });
      setEntries((prev) => [...prev, ...page.entries]);
      setCursor(page.nextCursor);
      setDone(page.nextCursor === null);
    } catch (err) {
      show(err?.message ?? "Couldn't load more.");
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, done, loadingMore, show]);

  // Local filtering — the page is small enough that we can do it in memory
  // instead of rebuilding a query for every keystroke. The "Load more" button
  // fetches the next page from the server, then we filter on top.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((row) => {
      if (topic !== "all" && row.focus_area !== topic) return false;
      if (!q) return true;
      return (
        row.original_text.toLowerCase().includes(q) ||
        row.corrected_text.toLowerCase().includes(q) ||
        (row.focus_area ?? "").toLowerCase().includes(q)
      );
    });
  }, [entries, query, topic]);

  const stats = useMemo(() => summarize(entries), [entries]);

  return (
    <div className="py-5 sm:py-6 px-3 sm:px-4 md:px-6 max-w-6xl mx-auto space-y-5 sm:space-y-6">
      {/* Header card with stats + filter controls */}
      <Card className="p-4 sm:p-5 lg:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <IconBadge tone="brand">
              <History className="w-5 h-5" />
            </IconBadge>
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                Submission history
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {loading
                  ? "Loading..."
                  : `${stats.total} ${stats.total === 1 ? "draft" : "drafts"} · avg ${stats.avgAccuracy}% accuracy`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <SearchBox value={query} onChange={setQuery} />
          <TopicFilter
            value={topic}
            onChange={setTopic}
            topics={topics}
          />
        </div>
      </Card>

      {error ? (
        <Card className="p-4 border-red-100 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5">
          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        </Card>
      ) : null}

      {loading ? (
        <HistorySkeleton />
      ) : visible.length === 0 ? (
        <EmptyState
          hasAny={entries.length > 0}
          query={query}
          topic={topic}
        />
      ) : (
        <div className="space-y-2">
          {visible.map((row) => (
            <HistoryRow
              key={row.id}
              row={row}
              isOpen={expanded === row.id}
              onToggle={() =>
                setExpanded((cur) => (cur === row.id ? null : row.id))
              }
            />
          ))}
        </div>
      )}

      {!loading && !done && cursor ? (
        <div className="flex justify-center pt-1">
          <Button
            variant="outline"
            size="md"
            onClick={loadMore}
            disabled={loadingMore}
            leftIcon={
              loadingMore ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )
            }
          >
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row                                                                */
/* ------------------------------------------------------------------ */

function HistoryRow({ row, isOpen, onToggle }) {
  const date = new Date(row.created_at);
  const tone = accuracyTone(row.accuracy_score);

  return (
    <Card
      padded={false}
      className={`overflow-hidden transition-colors ${
        isOpen
          ? "border-brand-300 dark:border-brand-500/40"
          : "hover:border-slate-300 dark:hover:border-slate-600"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-3.5 sm:p-4 flex items-start gap-3"
      >
        <div className="flex-shrink-0 pt-0.5">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-sm text-slate-700 dark:text-slate-200 line-clamp-2 break-words">
            {row.original_text}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill color={accuracyPillColor(row.accuracy_score)}>
              {row.accuracy_score}%
            </Pill>
            {row.mistake_count > 0 ? (
              <Pill color="slate">
                {row.mistake_count} {row.mistake_count === 1 ? "mistake" : "mistakes"}
              </Pill>
            ) : (
              <Pill color="emerald">Clean</Pill>
            )}
            {row.focus_area ? (
              <Pill color="brand">{row.focus_area}</Pill>
            ) : null}
          </div>
        </div>

        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest flex-shrink-0 text-right whitespace-nowrap pt-0.5">
          {fmtRelative(date)}
        </div>
      </button>

      {isOpen ? <RowDetail row={row} tone={tone} date={date} /> : null}
    </Card>
  );
}

function RowDetail({ row, tone, date }) {
  return (
    <div className="px-3.5 sm:px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-700 space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-2">
        <span>{date.toLocaleString()}</span>
        <span>·</span>
        <span>ID {row.id.slice(0, 8)}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="p-3 rounded-2xl border border-red-100 bg-red-50/40 dark:border-red-500/20 dark:bg-red-500/5 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">
            What you wrote
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed break-words whitespace-pre-wrap">
            {row.original_text}
          </p>
        </div>
        <div className="p-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Coach correction
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed break-words whitespace-pre-wrap">
            {row.corrected_text}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Pill color={tone}>
          {row.accuracy_score}% accuracy
        </Pill>
        {row.mistake_count > 0 ? (
          <Pill color="slate">
            {row.mistake_count} {row.mistake_count === 1 ? "mistake" : "mistakes"}
          </Pill>
        ) : (
          <Pill color="emerald">No mistakes</Pill>
        )}
        {row.focus_area ? <Pill color="brand">{row.focus_area}</Pill> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Filter controls                                                   */
/* ------------------------------------------------------------------ */

function SearchBox({ value, onChange }) {
  return (
    <div className="relative flex-1 min-w-0">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search drafts by text or topic..."
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold py-2.5 pl-9 pr-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 placeholder:text-slate-400"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function TopicFilter({ value, onChange, topics }) {
  return (
    <div className="relative sm:w-56 flex-shrink-0">
      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold py-2.5 pl-9 pr-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 cursor-pointer"
      >
        <option value="all">All topics</option>
        {topics.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty + loading                                                   */
/* ------------------------------------------------------------------ */

function EmptyState({ hasAny, query, topic }) {
  if (hasAny) {
    return (
      <Card className="py-12 text-center space-y-2">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          No drafts match your filters.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          {query && `Search: "${query}". `}
          {topic !== "all" && `Topic: ${topic}. `}
          Try clearing the search or selecting a different topic.
        </p>
      </Card>
    );
  }

  return (
    <Card className="py-14 text-center space-y-3">
      <div className="w-12 h-12 mx-auto rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/10 flex items-center justify-center">
        <History className="w-5 h-5" />
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        No drafts yet.
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
        Analyse a draft in the Writing Desk and it'll show up here so you can
        revisit and compare versions.
      </p>
    </Card>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <Card key={i} padded={false} className="p-4">
          <div className="flex items-start gap-3 animate-pulse">
            <div className="w-4 h-4 bg-slate-100 dark:bg-slate-800 rounded mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-2 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="flex gap-1.5">
                <div className="h-3 w-12 bg-slate-100 dark:bg-slate-800 rounded-full" />
                <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded-full" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function summarize(entries) {
  if (entries.length === 0) return { total: 0, avgAccuracy: 0 };
  const sum = entries.reduce((s, e) => s + (e.accuracy_score ?? 0), 0);
  return {
    total: entries.length,
    avgAccuracy: Math.round(sum / entries.length),
  };
}

function fmtRelative(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
