import { BookOpen, Sparkles, ArrowRight } from "lucide-react";
import { Card } from "../components/Card";
import { Pill } from "../components/Pill";
import { Button } from "../components/Button";

/** Phase 5-6 placeholder. Adaptive practice lessons + quizzes. */
export function PracticeModule() {
  return (
    <div className="py-6 px-6 max-w-5xl mx-auto space-y-8">
      <Card className="bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-slate-950 dark:to-indigo-950 text-white border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
              Recommended Focus
            </span>
            <h3 className="text-2xl font-black tracking-tight">
              Focus Module: Subject–Verb Agreement
            </h3>
            <p className="text-xs text-slate-400 max-w-lg">
              Master how singular and plural noun phrases map contextually with
              correct verb forms.
            </p>
          </div>
          <Button
            leftIcon={<Sparkles className="w-4 h-4" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="self-stretch md:self-auto"
          >
            Generate Custom Quiz
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-2xl dark:bg-emerald-500/10">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
              Practice Path
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lessons and quizzes based on your recurring mistakes.
            </p>
          </div>
          <Pill color="amber" className="ml-auto">
            Phase 5-6
          </Pill>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-4 mt-4">
          In Phase 5 the AI will generate pedagogical micro-lessons from your
          recurring mistake patterns. Phase 6 adds adaptive quizzes that test
          what you got wrong.
        </p>
      </Card>
    </div>
  );
}
