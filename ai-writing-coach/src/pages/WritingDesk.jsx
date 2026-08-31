import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  PenTool,
  Sparkles,
  CheckCircle2,
  XCircle,
  Lightbulb,
  RefreshCcw,
  ArrowRight,
  Repeat,
  History,
  Trophy,
  Copy,
} from "lucide-react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Pill } from "../components/Pill";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { Skeleton } from "../components/Skeleton";
import { analyzeText, logAnalysis } from "../lib/analysis";
import { logMistakes } from "../lib/mistakes";
import { getHistoryEntry } from "../lib/history";
import { bumpMastery } from "../lib/mastery";

/**
 * Phase 2 Writing Desk. The user types or pastes text, hits "Check it",
 * we call the analyze-text Edge Function, render the corrected version
 * and per-mistake explanations, then persist the result to analysis_logs.
 *
 * If the user lands here from the History page's "Review session" button
 * (location.state.reviewLogId), we fetch the saved row and re-render its
 * analysis without re-calling Gemini.
 */
export function WritingDesk() {
  const { session } = useAuth();
  const { show } = useToast();
  const location = useLocation();

  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reviewMeta, setReviewMeta] = useState(null); // { createdAt, id } when reviewing

  const wordCount = useMemo(
    () => (text.trim() ? text.trim().split(/\s+/).length : 0),
    [text]
  );

  // Review Session: if we arrived from /app/history with a row id in router
  // state, fetch the saved analysis and re-render it without re-calling
  // Gemini. We replace (don't merge) router state once consumed so a refresh
  // doesn't re-trigger the review.
  useEffect(() => {
    const reviewLogId = location.state?.reviewLogId;
    if (!reviewLogId || !session?.user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const entry = await getHistoryEntry(reviewLogId);
        if (cancelled) return;
        if (!entry) {
          show("Couldn't find that past submission.");
          return;
        }
        setText(entry.original_text);
        // Reconstruct the AnalysisResponse shape the ResultsPanel expects.
        // Old rows (pre-mistakes-column) won't have per-mistake detail; we
        // fall back to a "compare original vs corrected" view.
        const mistakes = Array.isArray(entry.mistakes) ? entry.mistakes : [];
        setAnalysis({
          corrected_sentence: entry.corrected_text,
          mistakes,
          explanation: entry.focus_area
            ? `Reviewed from your history. Focus: ${entry.focus_area}.`
            : "Reviewed from your history.",
          accuracyScore: entry.accuracy_score,
          focusArea: entry.focus_area ?? "",
        });
        setReviewMeta({ id: entry.id, createdAt: entry.created_at });
        show("Reloaded past submission.");
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[writing-desk] review load failed:", err);
        show(err?.message ?? "Couldn't load that past submission.");
      } finally {
        if (!cancelled) setLoading(false);
        // Replace router state so a refresh doesn't re-fire the review.
        if (!cancelled && typeof window !== "undefined") {
          window.history.replaceState({}, "");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.state, session, show]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const trimmed = text.trim();
    if (!trimmed) {
      show("Type or paste something first.");
      return;
    }
    if (!session?.user?.id) {
      show("Sign in to save your analyses.");
      return;
    }
    setLoading(true);
    setAnalysis(null);
    setReviewMeta(null);
    try {
      const result = await analyzeText(trimmed);
      setAnalysis(result);

      // Fire-and-forget: the analysis is already on screen, the user shouldn't
      // have to wait for background logging. Failures get logged to the console
      // and surfaced as a non-blocking toast.
      try {
        await logAnalysis(session.user.id, trimmed, result);
        show("Progress saved.");
      } catch (logErr) {
        // eslint-disable-next-line no-console
        console.warn("[writing-desk] failed to log analysis:", logErr);
        show(
          `Analysis worked, but progress was not saved: ${
            logErr?.message ?? "database write failed"
          }`
        );
      }

      // Phase 3: persist mistakes to memory and tag the result with
      // frequency / is_repeat so we can render "seen before" pills.
      // Phase 7: the bell surfaces repeat counts now — we don't toast them
      // here. log-mistake still writes the underlying rows + writes a
      // repeat_milestone notification when frequency_count crosses 3/5/10.
      if (result.mistakes && result.mistakes.length > 0) {
        try {
          const { tagged } = await logMistakes(result.mistakes);
          setAnalysis({ ...result, mistakes: tagged });
        } catch (memErr) {
          // eslint-disable-next-line no-console
          console.warn("[writing-desk] log-mistake failed:", memErr);
          show("Couldn't save to your mistake memory this time.");
        }
      }
    } catch (err) {
      show(err?.message ?? "Analysis failed. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setText("");
    setAnalysis(null);
    setReviewMeta(null);
  };

  return (
    <div className="py-5 sm:py-6 px-3 sm:px-4 md:px-6 max-w-[95rem] mx-auto lg:h-full lg:flex lg:flex-col">
      {reviewMeta ? (
        <div className="mb-4 sm:mb-5 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border border-indigo-100 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
          <History className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs font-semibold flex-1 min-w-0">
            Reviewing past submission from{" "}
            <span className="font-bold">
              {new Date(reviewMeta.createdAt).toLocaleString()}
            </span>
            . Hit <em>Check it</em> to re-analyse with the latest model.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="text-[10px] font-bold uppercase tracking-widest hover:underline flex-shrink-0"
          >
            Close review
          </button>
        </div>
      ) : null}
      <div className="grid lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 lg:items-stretch lg:flex-1 lg:min-h-0">
        {/* Editor */}
        <Card className="p-4 sm:p-5 lg:p-6 lg:col-span-5 lg:flex lg:flex-col lg:space-y-4 space-y-4 lg:h-full lg:min-h-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-50 text-brand-500 rounded-xl dark:bg-brand-500/10">
              <PenTool className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                Your draft
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Draft, correct and master grammatical mechanics instantly.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-3 lg:flex-1 lg:flex lg:flex-col lg:gap-3 lg:min-h-0"
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
              rows={5}
              maxLength={4000}
              placeholder="e.g. The team of developers does tried to fix the API modules, but they has failed continuously."
              className="w-full min-h-44 sm:min-h-56 lg:flex-1 lg:min-h-72 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 sm:p-4 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 resize-none disabled:opacity-60"
            />

            <div className="flex items-center justify-between text-xs text-slate-400 gap-2">
              <span className="truncate">
                {wordCount} {wordCount === 1 ? "word" : "words"} ·{" "}
                {text.length}/4000
              </span>
              {analysis && !loading ? (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex-shrink-0"
                >
                  <RefreshCcw className="w-3 h-3" />
                  <span className="hidden xs:inline sm:inline">Start over</span>
                </button>
              ) : null}
            </div>

            <Button
              type="submit"
              size="lg"
              fullWidth
              disabled={loading || !text.trim()}
              leftIcon={
                loading ? (
                  <Spinner />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )
              }
            >
              {loading ? "Checking…" : "Check it"}
            </Button>
          </form>
        </Card>

        {/* Results */}
        <div className="lg:col-span-7 space-y-4 lg:overflow-y-auto lg:pr-1 custom-scrollbar min-h-0">
          {loading ? <LoadingPanel /> : null}
          {!loading && analysis ? (
            <ResultsPanel analysis={analysis} originalText={text} />
          ) : null}
          {!loading && !analysis ? <EmptyPanel /> : null}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
  );
}

function EmptyPanel() {
  return (
    <Card className="p-10 text-center space-y-3">
      <div className="w-12 h-12 mx-auto rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/10 flex items-center justify-center">
        <Sparkles className="w-5 h-5" />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
        Type something on the left and hit <strong>Check it</strong>. Your
        corrected version and an explanation for each mistake will land here.
      </p>
    </Card>
  );
}

function LoadingPanel() {
  return (
    <Card className="p-10 text-center space-y-4">
      <div className="w-10 h-10 mx-auto border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Reading your draft…
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          This usually takes 2–5 seconds.
        </p>
      </div>
    </Card>
  );
}

function ResultsPanel({ analysis, originalText }) {
  const { corrected_sentence, mistakes, explanation, accuracyScore, focusArea } =
    analysis;
  const noMistakes = !mistakes || mistakes.length === 0;
  const repeatCount = noMistakes
    ? 0
    : mistakes.filter((m) => m.is_repeat).length;
  const allRepeats = !noMistakes && repeatCount === mistakes.length;

  return (
    <>
      <Card className="p-4 sm:p-5 lg:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Score
            </p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">
              {accuracyScore}
              <span className="text-base font-semibold text-slate-400">/100</span>
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2 sm:flex-col sm:items-end">
            <Pill color={noMistakes ? "emerald" : "amber"}>
              {noMistakes ? "No mistakes found" : `${mistakes.length} ${mistakes.length === 1 ? "mistake" : "mistakes"}`}
            </Pill>
            {focusArea ? (
              <Pill color="brand">Focus: {focusArea}</Pill>
            ) : null}
          </div>
        </div>

        {explanation ? (
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-3">
            {explanation}
          </p>
        ) : null}

        {allRepeats ? (
          <div className="flex items-start gap-2 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/30 rounded-xl p-2.5">
            <Repeat className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-semibold">All repeats.</span> This draft
              re-uses mistakes you've already made — focus on these before
              moving on.
            </p>
          </div>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <DiffPanel
          label="What you wrote"
          tone="red"
          text={originalText}
          mistakes={mistakes}
        />
        <DiffPanel
          label="Coach correction"
          tone="emerald"
          text={corrected_sentence}
          mistakes={mistakes}
        />
      </div>

      {noMistakes ? null : (
        <Card className="p-4 sm:p-5 lg:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
              What to fix
            </h4>
          </div>
          <div className="space-y-3">
            {mistakes.map((m, i) => (
              <>
                <MistakeCard key={i} index={i} mistake={m} />
                {mistakes.length - 1 !== i && <hr className="my-4" />}
              </>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function DiffPanel({ label, tone, text, mistakes }) {
  const isError = tone === "red";
  // Show temporary copied feedback
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-2xl border p-3.5 sm:p-4 space-y-2 relative ${
        isError
          ? "border-red-100 bg-red-50/40 dark:border-red-500/20 dark:bg-red-500/5"
          : "border-emerald-100 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5"
      }`}>
      {/* Copy button only for corrected (non‑error) panel */}
      {!isError && (
        <button
          type="button"
          onClick={handleCopy}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      )}
      <p
        className={`text-[10px] font-bold uppercase tracking-widest ${
          isError ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
        }`}
      >
        {label}
      </p>
      <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed break-words overflow-wrap-anywhere whitespace-pre-wrap">
        {isError
          ? renderWithMarks(text, mistakes, "red")
          : renderCorrected(text, mistakes)}
      </p>
    </div>
  );
}

/**
 * Quote-normalised substring search. Finds needle inside haystack tolerating
 * curly/smart-quote vs straight-quote differences introduced by LLMs.
 * Returns the character index in haystack, or -1 if not found.
 */
function findIn(haystack, needle, fromIndex = 0) {
  if (!needle) return -1;
  // Exact match first
  const direct = haystack.indexOf(needle, fromIndex);
  if (direct !== -1) return direct;
  // Quote-normalised
  const norm = (s) => s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
  const nhaystack = norm(haystack);
  const nneedle = norm(needle);
  const ni = nhaystack.indexOf(nneedle, fromIndex);
  if (ni !== -1) return ni;
  // Case-insensitive quote-normalised
  return nhaystack.toLowerCase().indexOf(nneedle.toLowerCase(), fromIndex);
}

/**
 * Render the original text with wavy red underlines beneath each mistake
 * substring. Falls back to plain text if a wrong_text isn't found.
 */
function renderWithMarks(text, mistakes, _tone) {
  if (!text) return null;
  if (!mistakes || mistakes.length === 0) return text;

  const ranges = [];
  let searchFrom = 0;
  for (const m of mistakes) {
    if (!m.wrong_text) continue;
    let idx = findIn(text, m.wrong_text, searchFrom);
    if (idx === -1) idx = findIn(text, m.wrong_text, 0); // retry from start
    if (idx === -1) continue;
    ranges.push({ start: idx, end: idx + m.wrong_text.length, mistake: m });
    searchFrom = idx + m.wrong_text.length;
  }
  ranges.sort((a, b) => a.start - b.start);

  if (ranges.length === 0) return text;

  const out = [];
  let cursor = 0;
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (r.start < cursor) continue; // overlap, skip
    if (r.start > cursor) out.push(text.slice(cursor, r.start));
    out.push(
      <span
        key={i}
        className="underline decoration-wavy decoration-red-500 text-red-600 dark:text-red-400"
        title={r.mistake.explanation}
      >
        {text.slice(r.start, r.end)}
      </span>
    );
    cursor = r.end;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

/**
 * Render the corrected sentence, with the corrected_text of each mistake
 * highlighted in green. Highlights appear in order of appearance.
 */
function renderCorrected(text, mistakes) {
  if (!text) return null;
  if (!mistakes || mistakes.length === 0) return text;

  const ranges = [];
  let cursor = 0;
  for (const m of mistakes) {
    if (!m.correct_text) continue;
    let idx = findIn(text, m.correct_text, cursor);
    if (idx === -1) idx = findIn(text, m.correct_text, 0); // retry from start
    if (idx === -1) continue;
    ranges.push({ start: idx, end: idx + m.correct_text.length });
    cursor = idx + m.correct_text.length;
  }

  if (ranges.length === 0) return text;
  ranges.sort((a, b) => a.start - b.start);

  const out = [];
  let prev = 0;
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (r.start < prev) continue;
    if (r.start > prev) out.push(text.slice(prev, r.start));
    out.push(
      <span
        key={i}
        className="font-semibold text-emerald-600 dark:text-emerald-400 underline decoration-2"
      >
        {text.slice(r.start, r.end)}
      </span>
    );
    prev = r.end;
  }
  if (prev < text.length) out.push(text.slice(prev));
  return out;
}

const MISTAKE_TYPE_LABELS = {
  subject_verb_agreement: "Subject-Verb Agreement",
  tense: "Tense",
  article: "Article",
  preposition: "Preposition",
  word_choice: "Word Choice",
  spelling: "Spelling",
  punctuation: "Punctuation",
  sentence_structure: "Sentence Structure",
  other: "Other",
};

function MistakeCard({ index, mistake }) {
  const { show } = useToast();
  const isRepeat = !!mistake.is_repeat;
  const count = mistake.frequency_count ?? 1;

  // Phase 8: per-card mastered state. Once the user clicks "Mark as
  // mastered" and the API call succeeds, we set this locally so the
  // card visually retires without waiting for the next dashboard
  // re-fetch. The bell notification (mastery_milestone) will still
  // appear the next time they open it.
  const [resolved, setResolved] = useState(!!mistake.resolved);
  const [bumping, setBumping] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleMarkMastered = async () => {
    if (!mistake.id) {
      show(
        "Couldn't link this mistake to your memory. Try a fresh draft and try again."
      );
      setShowConfirm(false);
      return;
    }
    setBumping(true);
    try {
      const result = await bumpMastery(mistake.id, "manual");
      setResolved(result.resolved);
      setShowConfirm(false);
      if (result.resolved) {
        show(
          `You mastered "${truncate(mistake.wrong_text, 30)}" — five levels cleared.`,
          {
            tone: "success",
            icon: <Trophy className="w-4 h-4" />,
            duration: 4000,
          }
        );
      } else {
        show(
          `Mastery bumped to ${result.new_level}/5. Keep at it.`,
          { tone: "brand", icon: <Sparkles className="w-4 h-4" /> }
        );
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[writing-desk] mark-mastered failed:", err);
      show(err?.message ?? "Couldn't update mastery. Try again.");
    } finally {
      setBumping(false);
    }
  };

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl border space-y-2.5 transition-colors ${
        resolved
          ? "border-emerald-100 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5"
          : "border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50"
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          #{index + 1}
        </span>
        <Pill color="amber">
          {MISTAKE_TYPE_LABELS[mistake.type] ?? mistake.type}
        </Pill>
        {isRepeat && !resolved ? (
          <Pill color="indigo">
            <span className="inline-flex items-center gap-1">
              <Repeat className="w-3 h-3" />
              ×{count} · seen before
            </span>
          </Pill>
        ) : null}
        {resolved ? (
          <Pill color="emerald">
            <span className="inline-flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              mastered
            </span>
          </Pill>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
        <span
          className={`inline-flex items-center gap-1.5 line-through decoration-wavy break-words max-w-full ${
            resolved ? "text-slate-400 dark:text-slate-500" : "text-red-500"
          }`}
        >
          <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{mistake.wrong_text}</span>
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span
          className={`inline-flex items-center gap-1.5 font-semibold break-words max-w-full ${
            resolved
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{mistake.correct_text}</span>
        </span>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-words overflow-wrap-anywhere">
        {mistake.explanation}
      </p>

      {mistake.tip ? (
        <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 rounded-xl p-2.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed break-words overflow-wrap-anywhere">
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              Tip:{" "}
            </span>
            {mistake.tip}
          </p>
        </div>
      ) : null}

      {/* Phase 8: mark as mastered. Hidden once the row is resolved
          so the card visually retires into the success state. */}
      {!resolved ? (
        <div className="pt-1">
          {showConfirm ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5">
              <p className="text-xs text-slate-600 dark:text-slate-300 flex-1 min-w-[10rem]">
                Mark <span className="font-semibold">"{truncate(mistake.wrong_text, 40)}"</span> as mastered? Your mastery will go up by 1.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirm(false)}
                disabled={bumping}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleMarkMastered}
                disabled={bumping}
                leftIcon={<Trophy className="w-3.5 h-3.5" />}
              >
                {bumping ? "Marking…" : "Yes, mark mastered"}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <Trophy className="w-3.5 h-3.5" />
              I know this now — mark as mastered
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function truncate(s, n) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
