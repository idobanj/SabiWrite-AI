import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
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
import { IconBadge } from "../components/IconBadge";
import { Skeleton, TableBodySkeleton } from "../components/Skeleton";
import { useToast } from "../components/Toast";
import {
  deleteHistoryEntry,
  getHistoryPage,
  getHistoryTopics,
} from "../lib/history";

const PAGE_SIZE = 25;

/**
 * History page. Uses a compact summary and result-first filters, a flexible
 * four-column table on larger screens, and stacked cards on mobile. Reviewing
 * a row re-opens its saved analysis without re-calling the AI service.
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
  const [status, setStatus] = useState("all");
  const [topic, setTopic] = useState("all");
  const [topics, setTopics] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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
      if (status === "issues" && row.mistake_count === 0) return false;
      if (status === "clean" && row.mistake_count > 0) return false;
      if (topic !== "all" && row.focus_area !== topic) return false;
      if (!q) return true;
      return (
        row.original_text.toLowerCase().includes(q) ||
        row.corrected_text.toLowerCase().includes(q) ||
        (row.focus_area ?? "").toLowerCase().includes(q)
      );
    });
  }, [entries, query, status, topic]);

  const stats = useMemo(() => summarize(entries), [entries]);

  const handleReview = (row) => {
    navigate("/app/workspace", { state: { reviewLogId: row.id } });
  };

  const handleDelete = async () => {
    if (!deleteTarget || deletingId) return;
    const id = deleteTarget.id;
    setDeletingId(id);
    try {
      await deleteHistoryEntry(id);
      try {
        const page = await getHistoryPage({ pageSize: PAGE_SIZE });
        setEntries(page.entries);
        setCursor(page.nextCursor);
        setDone(page.nextCursor === null);
      } catch {
        // The delete was already verified against the database. Keep the UI
        // accurate even if the immediate list refresh has a network issue.
        setEntries((current) => current.filter((entry) => entry.id !== id));
      }
      setDeleteTarget(null);
      show(`History entry deleted. Progress and practice have been updated.`, {
        tone: "success",
      });
    } catch (err) {
      show(err?.message ?? "Couldn't delete this history entry.", {
        tone: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="py-5 sm:py-6 px-3 sm:px-4 md:px-6 max-w-6xl mx-auto space-y-4 sm:space-y-5">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <IconBadge tone="brand" size="lg">
              <History className="w-5 h-5" />
            </IconBadge>
            <div className="min-w-0">
              <h2 className="font-black tracking-tight text-slate-950 dark:text-white text-xl sm:text-2xl">
                Your drafts at a glance
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Find a draft by result, topic, or text.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-3">
            <SummaryMetric loading={loading} value={stats.total} label="Drafts" />
            <SummaryMetric loading={loading} value={stats.needsReview} label="With issues" tone="amber" />
            <SummaryMetric loading={loading} value={`${stats.avgAccuracy}%`} label="Avg. score" tone="brand" />
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/35 sm:p-4">
          <div className="flex flex-col gap-3">
            <StatusFilter value={status} onChange={setStatus} stats={stats} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchBox value={query} onChange={setQuery} />
              <TopicFilter value={topic} onChange={setTopic} topics={topics} />
            </div>
          </div>
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
        <EmptyState
          hasAny={entries.length > 0}
          query={query}
          status={status}
          topic={topic}
          onClear={() => {
            setQuery("");
            setStatus("all");
            setTopic("all");
          }}
          onWrite={() => navigate("/app/workspace")}
        />
      ) : (
        <>
          {/* Desktop / tablet */}
          <div className="hidden lg:block">
            <Card padded={false} className="overflow-hidden">
                <table className="w-full table-fixed text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                      <th className="px-4 py-3 w-[17%]">Date</th>
                      <th className="px-4 py-3 w-[43%]">Draft preview</th>
                      <th className="px-4 py-3 w-[18%]">Result</th>
                      <th className="px-4 py-3 w-[22%] text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 font-medium">
                    {visible.map((row) => (
                      <HistoryTableRow
                        key={row.id}
                        row={row}
                        onReview={() => handleReview(row)}
                        onDelete={() => setDeleteTarget(row)}
                        deleting={deletingId === row.id}
                      />
                    ))}
                  </tbody>
                </table>
            </Card>
          </div>

          {/* Mobile: stacked cards, same data, same Review button */}
          <div className="space-y-2 lg:hidden">
            {visible.map((row) => (
              <HistoryMobileRow
                key={row.id}
                row={row}
                onReview={() => handleReview(row)}
                onDelete={() => setDeleteTarget(row)}
                deleting={deletingId === row.id}
              />
            ))}
          </div>
        </>
      )}

      {!loading && entries.length > 0 ? (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">
              Ready to analyse another draft?
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              New analyses will appear here and update your progress automatically.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/app/workspace")}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
            className="self-start sm:self-auto"
          >
            Go to Writing Desk
          </Button>
        </Card>
      ) : null}

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

      <DeleteHistoryDialog
        row={deleteTarget}
        deleting={deletingId === deleteTarget?.id}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rows                                                              */
/* ------------------------------------------------------------------ */

function HistoryTableRow({ row, onReview, onDelete, deleting }) {
  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onReview();
    }
  };

  return (
    <tr
      tabIndex={0}
      onClick={onReview}
      onKeyDown={handleKeyDown}
      aria-label={`Review draft from ${fmtDate(row.created_at)}`}
      className="group cursor-pointer transition-colors hover:bg-brand-50/40 focus:bg-brand-50/50 focus:outline-none dark:hover:bg-brand-500/5 dark:focus:bg-brand-500/10"
    >
      <td className="px-4 py-4 align-middle">
        <p className="font-bold text-slate-700 dark:text-slate-200">
          {fmtDate(row.created_at)}
        </p>
        <p className="mt-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          {fmtTime(row.created_at)}
        </p>
      </td>
      <td className="px-4 py-4 align-middle">
        <p className="truncate text-sm font-bold text-slate-900 dark:text-white" title={row.original_text}>
          {row.original_text}
        </p>
        <p className="mt-1 truncate text-[11px] font-medium text-slate-400 dark:text-slate-500">
          {row.focus_area && row.focus_area !== "General"
            ? humanizeTopic(row.focus_area)
            : "General writing"}
        </p>
      </td>
      <td className="px-4 py-4 align-middle">
        <ResultBadge row={row} />
      </td>
      <td className="px-4 py-4 align-middle">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              onReview();
            }}
            className="px-2.5 text-brand-600 border-brand-100 group-hover:border-brand-200 dark:text-brand-400 dark:border-brand-500/30 hover:bg-brand-50 dark:hover:bg-brand-500/10"
          >
            Review
          </Button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            disabled={deleting}
            aria-label={`Delete draft from ${fmtDate(row.created_at)}`}
            title="Delete draft"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:pointer-events-none disabled:opacity-50 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

function HistoryMobileRow({ row, onReview, onDelete, deleting }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold leading-relaxed text-slate-900 dark:text-white line-clamp-2 break-words">
            {row.original_text}
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {fmtDate(row.created_at)} · {fmtTime(row.created_at)}
          </p>
        </div>
        <ResultBadge row={row} compact />
      </div>
      <div className="flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
        <Button
          size="sm"
          variant="outline"
          onClick={onReview}
          className="flex-1 text-brand-600 border-brand-100 dark:text-brand-400 dark:border-brand-500/30 hover:bg-brand-50 dark:hover:bg-brand-500/10"
        >
          Review draft
        </Button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label={`Delete draft from ${fmtDate(row.created_at)}`}
          className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:text-slate-500 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </Card>
  );
}

function ResultBadge({ row, compact = false }) {
  const clean = row.mistake_count === 0;
  return (
    <div
      className={`inline-flex flex-shrink-0 items-center gap-2 rounded-xl border ${
        compact ? "px-2 py-1.5" : "px-2.5 py-2"
      } ${
        clean
          ? "border-emerald-100 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-amber-100 bg-amber-50/80 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
      }`}
    >
      {clean ? (
        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
      )}
      <div className="leading-none">
        <p className="whitespace-nowrap text-[11px] font-extrabold">
          {clean
            ? "Clean"
            : `${row.mistake_count} ${row.mistake_count === 1 ? "issue" : "issues"}`}
        </p>
        {!compact ? (
          <p className="mt-1 text-[10px] font-bold opacity-75">
            {row.accuracy_score}% score
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DeleteHistoryDialog({ row, deleting, onCancel, onConfirm }) {
  if (!row) return null;
  const text = row.original_text ?? "";
  const preview = text.length > 120 ? `${text.slice(0, 119)}…` : text;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-history-title"
        aria-describedby="delete-history-description"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2
              id="delete-history-title"
              className="text-base font-extrabold text-slate-900 dark:text-white"
            >
              Delete this history entry?
            </h2>
            <p
              id="delete-history-description"
              className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400"
            >
              This removes the selected analysis and its mistakes from your history, progress, and personalised practice. This action cannot be undone.
            </p>
          </div>
        </div>

        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          “{preview}”
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onCancel}
            disabled={deleting}
            autoFocus
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={onConfirm}
            disabled={deleting}
            leftIcon={
              deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )
            }
          >
            {deleting ? "Deleting…" : "Delete entry"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Filter controls                                                   */
/* ------------------------------------------------------------------ */

function SummaryMetric({ loading, value, label, tone = "slate" }) {
  const tones = {
    slate: "text-slate-900 dark:text-white",
    amber: "text-amber-600 dark:text-amber-300",
    brand: "text-brand-600 dark:text-brand-300",
  };

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center dark:border-slate-700 dark:bg-slate-900/60 sm:min-w-[82px]">
      {loading ? (
        <Skeleton w="w-8" h="h-4" className="mx-auto" />
      ) : (
        <p className={`text-sm font-black ${tones[tone]}`}>{value}</p>
      )}
      <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </p>
    </div>
  );
}

function StatusFilter({ value, onChange, stats }) {
  const items = [
    { value: "all", label: "All", count: stats.total },
    { value: "issues", label: "Needs review", count: stats.needsReview },
    { value: "clean", label: "Clean", count: stats.clean },
  ];

  return (
    <div
      className="grid w-full grid-cols-3 gap-1 rounded-xl bg-slate-200/60 p-1 dark:bg-slate-950/50 sm:flex sm:w-fit"
      aria-label="Filter history by result"
    >
      {items.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            aria-pressed={active}
            className={`flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 text-[11px] font-bold transition-colors sm:min-w-max sm:px-3 ${
              active
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {item.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                active
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
                  : "bg-slate-300/60 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
              }`}
            >
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

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
            {humanizeTopic(t)}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty + loading                                                   */
/* ------------------------------------------------------------------ */

function EmptyState({ hasAny, query, status, topic, onClear, onWrite }) {
  if (hasAny) {
    return (
      <Card className="py-12 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          No drafts match your filters.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          {query && `Search: "${query}". `}
          {status !== "all" && `Status: ${status === "clean" ? "Clean" : "Needs review"}. `}
          {topic !== "all" && `Topic: ${humanizeTopic(topic)}. `}
          Try clearing the search or selecting a different topic.
        </p>
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear filters
        </Button>
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
      <Button size="sm" onClick={onWrite} rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
        Analyse your first draft
      </Button>
    </Card>
  );
}

function HistoryTableSkeleton() {
  return (
    <>
      <Card padded={false} className="hidden overflow-hidden lg:block">
          <table className="w-full table-fixed text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                <th className="px-4 py-3 w-[17%]">Date</th>
                <th className="px-4 py-3 w-[43%]">Draft preview</th>
                <th className="px-4 py-3 w-[18%]">Result</th>
                <th className="px-4 py-3 w-[22%] text-right">Action</th>
              </tr>
            </thead>
            <TableBodySkeleton rows={6} columns={4} />
          </table>
      </Card>
      <div className="space-y-2 lg:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton w="w-full" h="h-3.5" />
                <Skeleton w="w-32" h="h-2.5" />
              </div>
              <Skeleton w="w-16" h="h-8" className="rounded-xl" />
            </div>
            <Skeleton w="w-full" h="h-8" className="rounded-lg" />
          </Card>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function summarize(entries) {
  if (entries.length === 0) {
    return { total: 0, clean: 0, needsReview: 0, avgAccuracy: 0 };
  }
  const sum = entries.reduce((s, e) => s + (e.accuracy_score ?? 0), 0);
  const clean = entries.filter((entry) => entry.mistake_count === 0).length;
  return {
    total: entries.length,
    clean,
    needsReview: entries.length - clean,
    avgAccuracy: Math.round(sum / entries.length),
  };
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function fmtTime(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

function humanizeTopic(topic) {
  if (!topic) return "General writing";
  return topic
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
