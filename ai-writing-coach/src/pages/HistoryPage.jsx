import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Filter,
  History,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Pill } from "../components/Pill";
import { IconBadge } from "../components/IconBadge";
import { Skeleton, TableBodySkeleton } from "../components/Skeleton";
import { useToast } from "../components/Toast";
import { getHistoryPage, getHistoryTopics } from "../lib/history";
import { fmtRelative } from "../lib/format";

const PAGE_SIZE = 25;

function accuracyPillColor(score) {
  if (score >= 80) return "emerald";
  if (score >= 50) return "amber";
  return "red";
}

/**
 * Phase 4: History page. Mirrors the reference design — a 5-column table
 * (Date · Snippet · Mistakes · Score · Actions) on tablet/desktop and a
 * stacked-card list on mobile. Each row has a "Review Session" button
 * that re-opens the saved analysis in the Writing Desk without re-calling
 * Gemini.
 */
export function HistoryPage() {
  const { show } = useToast();
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const [topics, setTopics] = useState([]);

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

  const handleReview = (row) => {
    navigate("/app/workspace", { state: { reviewLogId: row.id } });
  };

  return (
    <div className="py-5 sm:py-6 px-3 sm:px-4 md:px-6 max-w-6xl mx-auto space-y-5 sm:space-y-6">
      {/* Header card with summary + filter controls */}
      <Card className="p-4 sm:p-5 lg:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <IconBadge tone="brand">
              <History className="w-5 h-5" />
            </IconBadge>
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                Writing history logs
              </h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 min-h-[1.25rem]">
                {loading ? (
                  <Skeleton w="w-56" h="h-2.5" />
                ) : (
                  <>
                    {stats.total} {stats.total === 1 ? "draft" : "drafts"} ·
                    avg {stats.avgAccuracy}% accuracy
                  </>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="md"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            disabled
            title="Coming soon"
          >
            Clear all history
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <SearchBox value={query} onChange={setQuery} />
          <TopicFilter value={topic} onChange={setTopic} topics={topics} />
        </div>
      </Card>

      {error ? (
        <Card className="p-4 border-red-100 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5">
          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        </Card>
      ) : null}

      {loading ? (
        <HistoryTableSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState hasAny={entries.length > 0} query={query} topic={topic} />
      ) : (
        <>
          {/* Desktop / tablet: classic table matching the reference */}
          <div className="hidden md:block">
            <Card padded={false} className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs table-fixed">
                  <thead>
                    <tr className="dark:bg-slate-900 bg-slate-50 border-b border-slate-200 text-slate-500 dark:text-slate-100 font-bold">
                      <th className="p-4 w-1/5 whitespace-nowrap">Submission Date</th>
                      <th className="p-4 w-1/5 whitespace-nowrap">Text Snippet Preview</th>
                      <th className="p-4 w-1/5 whitespace-nowrap">Mistakes Identified</th>
                      <th className="p-4 w-1/5 whitespace-nowrap">Accuracy Score</th>
                      <th className="p-4 w-1/5 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {visible.map((row) => (
                      <HistoryTableRow
                        key={row.id}
                        row={row}
                        onReview={() => handleReview(row)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile: stacked cards, same data, same Review button */}
          <div className="md:hidden space-y-2">
            {visible.map((row) => (
              <HistoryMobileRow
                key={row.id}
                row={row}
                onReview={() => handleReview(row)}
              />
            ))}
          </div>
        </>
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
                <RotateCcw className="w-3.5 h-3.5" />
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
/*  Rows                                                              */
/* ------------------------------------------------------------------ */

function HistoryTableRow({ row, onReview }) {
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      <td className="p-4 w-1/5 text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">
        {fmtTableDate(row.created_at)}
      </td>
      <td className="p-4 w-1/5 text-slate-800 dark:text-slate-200">
        <p className="truncate" title={row.original_text}>
          {row.original_text}
        </p>
      </td>
      <td className="p-4 w-1/5">
        {row.mistake_count > 0 ? (
          <Pill color="red" className="border-0">{row.mistake_count} errors flagged</Pill>
        ) : (
          <Pill color="emerald" className="border-0">No errors</Pill>
        )}
      </td>
      <td className="p-4 w-1/5 text-slate-900 dark:text-white font-extrabold whitespace-nowrap">
        {row.accuracy_score}%
      </td>
      <td className="p-4 w-1/5 text-right">
        <Button
          size="sm"
          variant="outline"
          onClick={onReview}
          className="text-brand-500 border-brand-100 dark:border-brand-500/30 hover:bg-brand-50 dark:hover:bg-brand-500/10"
        >
          Review session
        </Button>
      </td>
    </tr>
  );
}

function HistoryMobileRow({ row, onReview }) {
  return (
    <Card className="p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-slate-700 dark:text-slate-200 line-clamp-2 break-words flex-1 min-w-0">
          {row.original_text}
        </p>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest whitespace-nowrap flex-shrink-0">
          {fmtRelative(new Date(row.created_at))}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill color={accuracyPillColor(row.accuracy_score)}>
          {row.accuracy_score}%
        </Pill>
        {row.mistake_count > 0 ? (
          <Pill color="red">
            {row.mistake_count} {row.mistake_count === 1 ? "error" : "errors"}
          </Pill>
        ) : (
          <Pill color="emerald">Clean</Pill>
        )}
        {row.focus_area ? <Pill color="brand">{row.focus_area}</Pill> : null}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onReview}
        fullWidth
        className="text-brand-500 border-brand-100 dark:border-brand-500/30 hover:bg-brand-50 dark:hover:bg-brand-500/10"
      >
        Review session
      </Button>
    </Card>
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

function HistoryTableSkeleton() {
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold">
              <th className="p-4">Submission date</th>
              <th className="p-4">Text snippet preview</th>
              <th className="p-4">Mistakes identified</th>
              <th className="p-4">Accuracy score</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <TableBodySkeleton rows={6} columns={5} />
        </table>
      </div>
    </Card>
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

function fmtTableDate(iso) {
  if (!iso) return "—";
  // YYYY-MM-DD HH:MM, matching the reference's dateStr shape
  return iso.replace("T", " ").slice(0, 16);
}
