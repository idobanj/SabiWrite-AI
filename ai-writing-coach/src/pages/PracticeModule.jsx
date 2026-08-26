import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  RefreshCcw,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Pill } from "../components/Pill";
import { IconBadge } from "../components/IconBadge";
import { useToast } from "../components/Toast";
import { getUserStats } from "../lib/stats";
import {
  generateQuiz,
  gradeQuiz,
  getLastQuizSession,
  saveQuizSession,
} from "../lib/practice";

const TYPE_LABELS = {
  subject_verb_agreement: "Subject-Verb Agreement",
  tense: "Tense Consistency",
  article: "Articles",
  preposition: "Prepositions",
  word_choice: "Vocabulary Nuance",
  spelling: "Spelling",
  punctuation: "Punctuation & Run-On Sentences",
  sentence_structure: "Sentence Structure",
  other: "General Mechanics",
};

const TYPE_TONE = {
  subject_verb_agreement: "brand",
  tense: "indigo",
  article: "amber",
  preposition: "emerald",
  word_choice: "brand",
  spelling: "red",
  punctuation: "amber",
  sentence_structure: "indigo",
  other: "slate",
};

const QUIZ_LENGTH = 5;

/**
 * Phase 5: Practice module. Three states:
 *   1. landing  — shows the writer's #1 focus area + Start Quiz
 *   2. active   — presents 5 questions one at a time with immediate feedback
 *   3. result   — score, retry, back-to-landing
 */
export function PracticeModule() {
  return (
    <div className="py-5 sm:py-6 px-3 sm:px-4 md:px-6 max-w-5xl mx-auto space-y-5 sm:space-y-6">
      <PracticeFlow />
    </div>
  );
}

function PracticeFlow() {
  const { show } = useToast();
  const [phase, setPhase] = useState("landing"); // 'landing' | 'loading' | 'active' | 'result'
  const [topic, setTopic] = useState(null);
  const [topicLabel, setTopicLabel] = useState("");
  const [topicCount, setTopicCount] = useState(0);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const startQuiz = async (t, label, count) => {
    setTopic(t);
    setTopicLabel(label);
    setTopicCount(count);
    setPhase("loading");
    setError("");
    setQuiz(null);
    setAnswers([]);
    try {
      const q = await generateQuiz(t, QUIZ_LENGTH);
      setQuiz(q);
      setAnswers(new Array(q.questions.length).fill(null));
      setPhase("active");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[practice] generateQuiz failed:", err);
      setError(err?.message ?? "Couldn't generate a quiz.");
      setPhase("landing");
      show("Couldn't generate a quiz right now. Try again in a moment.");
    }
  };

  const handleAnswer = (questionIndex, optionIndex) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
  };

  const handleFinish = async () => {
    if (!quiz) return;
    const result = gradeQuiz(quiz.questions, answers);
    // Fire-and-forget persistence — the user already has the result on screen.
    try {
      await saveQuizSession(quiz, answers, result);
    } catch {
      /* already warned in the lib */
    }
    setResult(result);
    setPhase("result");
  };

  const handleRetry = () => {
    startQuiz(topic, topicLabel, topicCount);
  };

  const handleBack = () => {
    setPhase("landing");
    setQuiz(null);
    setAnswers([]);
    setResult(null);
  };

  if (phase === "active" && quiz) {
    return (
      <ActiveQuiz
        quiz={quiz}
        answers={answers}
        onAnswer={handleAnswer}
        onFinish={handleFinish}
        onBack={handleBack}
      />
    );
  }

  if (phase === "result" && quiz && result) {
    return (
      <ResultScreen
        quiz={quiz}
        answers={answers}
        result={result}
        topicLabel={topicLabel}
        onRetry={handleRetry}
        onBack={handleBack}
      />
    );
  }

  return (
    <LandingScreen
      loading={phase === "loading"}
      error={error}
      onStart={startQuiz}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Landing screen                                                    */
/* ------------------------------------------------------------------ */

function LandingScreen({ loading, error, onStart }) {
  const { show } = useToast();
  const [focus, setFocus] = useState(null);
  const [focusLoading, setFocusLoading] = useState(true);
  const [lastSession, setLastSession] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFocusLoading(true);
      try {
        const stats = await getUserStats("all");
        if (cancelled) return;
        const top = stats.top_mistake_types?.[0];
        if (top) {
          setFocus({
            type: top.type,
            label: TYPE_LABELS[top.type] ?? top.type,
            count: top.count,
          });
        } else {
          setFocus(null);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[practice] getUserStats failed:", err);
        if (!cancelled) {
          setFocus(null);
          show("Couldn't load your focus area.");
        }
      } finally {
        if (!cancelled) setFocusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [show]);

  // When the focus changes, fetch that topic's most recent session
  useEffect(() => {
    if (!focus) {
      setLastSession(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const s = await getLastQuizSession(focus.type);
      if (!cancelled) setLastSession(s);
    })();
    return () => {
      cancelled = true;
    };
  }, [focus]);

  const handleStart = () => {
    if (!focus) return;
    onStart(focus.type, focus.label, focus.count);
  };

  return (
    <>
      {/* Hero / recommended focus */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 dark:from-indigo-950 dark:via-slate-950 dark:to-slate-950 text-white border-slate-800 p-5 sm:p-6 lg:p-7">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-6">
          <IconBadge tone="amber" size="lg" className="bg-amber-500/15 text-amber-300">
            <Target className="w-7 h-7" />
          </IconBadge>

          <div className="flex-1 min-w-0 space-y-2">
            <Pill color="amber" className="bg-amber-500/20 text-amber-300 border-amber-500/30">
              Recommended Focus
            </Pill>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {focusLoading
                ? "Finding your focus..."
                : focus
                ? focus.label
                : "No focus yet"}
            </h2>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              {focus
                ? `You've logged ${focus.count} ${focus.count === 1 ? "mistake" : "mistakes"} in this category. A short quiz on it will reinforce the rule.`
                : "Analyse a few drafts in the Writing Desk and we'll recommend a topic to drill here."}
            </p>
            {lastSession ? (
              <div className="flex items-center gap-2 pt-1">
                <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-400 font-semibold">
                  Last attempt: {lastSession.score} / {lastSession.total} (
                  {fmtRelative(new Date(lastSession.created_at))})
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex-shrink-0">
            <Button
              size="lg"
              onClick={handleStart}
              disabled={!focus || loading}
              leftIcon={
                loading ? <Spinner /> : <Sparkles className="w-4 h-4" />
              }
              rightIcon={!loading ? <ArrowRight className="w-4 h-4" /> : null}
            >
              {loading ? "Generating…" : "Start Quiz"}
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="p-4 border-red-100 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5">
          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        </Card>
      ) : null}

      {/* What this does */}
      <Card className="p-4 sm:p-5 lg:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <IconBadge tone="brand">
            <BookOpen className="w-5 h-5" />
          </IconBadge>
          <div className="min-w-0">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              How the quiz works
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Five short questions, drawn from your own recurring mistakes.
            </p>
          </div>
        </div>
        <ul className="grid sm:grid-cols-3 gap-3">
          <FlowStep
            icon={<Zap className="w-3.5 h-3.5" />}
            title="Personalised"
            body="The questions mirror the wrong → correct patterns you keep making."
          />
          <FlowStep
            icon={<Lightbulb className="w-3.5 h-3.5" />}
            title="Instant feedback"
            body="Each answer shows the rule, so wrong choices still teach something."
          />
          <FlowStep
            icon={<BarChart3 className="w-3.5 h-3.5" />}
            title="Tracked"
            body="Your score is saved so you can see improvement over time."
          />
        </ul>
      </Card>
    </>
  );
}

function FlowStep({ icon, title, body }) {
  return (
    <li className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-1.5">
      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">
          {title}
        </span>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        {body}
      </p>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Active quiz                                                       */
/* ------------------------------------------------------------------ */

function ActiveQuiz({ quiz, answers, onAnswer, onFinish, onBack }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const total = quiz.questions.length;
  const currentQuestion = quiz.questions[currentIndex];
  const currentAnswer = answers[currentIndex];
  const allAnswered = answers.every((a) => a !== null);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;

  const handlePrev = () => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    if (isLast) {
      onFinish();
    } else {
      setCurrentIndex((i) => Math.min(i + 1, total - 1));
    }
  };

  return (
    <Card className="p-5 sm:p-6 lg:p-7 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <IconBadge tone={TYPE_TONE[quiz.topic] ?? "brand"} size="sm">
            <BookOpen className="w-4 h-4" />
          </IconBadge>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Topic
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {quiz.topic_label}
            </p>
          </div>
        </div>
        <Pill color="brand">
          Question {currentIndex + 1} of {total}
        </Pill>
      </div>

      <ProgressBar
        value={answers.filter((a) => a !== null).length}
        total={total}
      />

      <div className="space-y-4">
        <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed break-words">
          {currentQuestion.prompt}
        </p>

        <div className="space-y-2.5">
          {currentQuestion.options.map((option, i) => {
            const isSelected = currentAnswer === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onAnswer(currentIndex, i)}
                className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                  isSelected
                    ? "border-brand-500 bg-brand-50/50 dark:bg-brand-500/10"
                    : "border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-500/40 bg-white dark:bg-slate-900"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    isSelected
                      ? "bg-brand-500 text-white"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed break-words">
                  {option}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
        >
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          {!isFirst && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handlePrev}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
          )}
          {!isLast ? (
            <Button
              type="button"
              size="md"
              onClick={handleNext}
              disabled={currentAnswer === null}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              size="md"
              onClick={handleNext}
              disabled={!allAnswered}
              rightIcon={<Check className="w-4 h-4" />}
            >
              Submit
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function ProgressBar({ value, total }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <span>Progress</span>
        <span>
          {value} / {total}
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Result screen                                                     */
/* ------------------------------------------------------------------ */

function ResultScreen({ quiz, answers, result, topicLabel, onRetry, onBack }) {
  const pct = result.total === 0 ? 0 : Math.round((result.score / result.total) * 100);
  const headline =
    pct === 100
      ? "Perfect run."
      : pct >= 80
      ? "Strong work."
      : pct >= 50
      ? "Solid base — keep going."
      : "Worth another pass.";
  const tone =
    pct === 100 ? "emerald" : pct >= 50 ? "brand" : "amber";

  return (
    <>
      <Card className="p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              tone === "emerald"
                ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10"
                : tone === "brand"
                ? "bg-brand-50 text-brand-500 dark:bg-brand-500/10"
                : "bg-amber-50 text-amber-500 dark:bg-amber-500/10"
            }`}
          >
            <span className="text-3xl font-black">{pct}%</span>
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <Pill color={tone}>{topicLabel}</Pill>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {headline}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You scored {result.score} out of {result.total} on {topicLabel.toLowerCase()}.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5 lg:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
            Review your answers
          </h3>
        </div>
        <div className="space-y-2.5">
          {quiz.questions.map((q, i) => {
            const userAnswer = answers[i];
            const isCorrect = result.correct_per_question[i];
            return (
              <ReviewRow
                key={q.id}
                index={i}
                question={q}
                userAnswer={userAnswer}
                isCorrect={isCorrect}
              />
            );
          })}
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          onClick={onRetry}
          leftIcon={<RefreshCcw className="w-4 h-4" />}
        >
          Try a fresh quiz
        </Button>
        <Button
          variant="outline"
          onClick={onBack}
          leftIcon={<ArrowRight className="w-4 h-4" />}
        >
          Back to Practice
        </Button>
        <Link to="/app/analytics" className="ml-auto">
          <Button
            variant="ghost"
            rightIcon={<BarChart3 className="w-4 h-4" />}
          >
            See your progress
          </Button>
        </Link>
      </div>
    </>
  );
}

function ReviewRow({ index, question, userAnswer, isCorrect }) {
  return (
    <div
      className={`p-3.5 rounded-2xl border space-y-2 ${
        isCorrect
          ? "border-emerald-100 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5"
          : "border-red-100 bg-red-50/40 dark:border-red-500/20 dark:bg-red-500/5"
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
            isCorrect
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {isCorrect ? (
            <Check className="w-3 h-3" />
          ) : (
            <X className="w-3 h-3" />
          )}
        </span>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Question {index + 1}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed break-words">
            {question.prompt}
          </p>
          {!isCorrect && userAnswer !== null ? (
            <p className="text-xs text-red-600 dark:text-red-300">
              You picked:{" "}
              <span className="font-semibold">{question.options[userAnswer]}</span>
            </p>
          ) : null}
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            Correct:{" "}
            <span className="font-semibold">
              {question.options[question.answer_index]}
            </span>
          </p>
          {question.explanation ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {question.explanation}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
  );
}

function fmtRelative(date) {
  const now = new Date();
  const diffMin = Math.floor((now - date) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
