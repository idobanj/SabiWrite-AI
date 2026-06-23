import { Card } from "../components/Card";
import { Pill } from "../components/Pill";
import { PenTool, Sparkles } from "lucide-react";

/** Phase 2 placeholder. Real workspace with textarea + AI analysis arrives next. */
export function WritingDesk() {
  return (
    <div className="py-6 px-6 max-w-[1500px] mx-auto space-y-6">
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-50 text-brand-500 rounded-2xl dark:bg-brand-500/10">
            <PenTool className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
              Writing Desk
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The heart of the writing coach.
            </p>
          </div>
          <Pill color="amber" className="ml-auto">
            Phase 2
          </Pill>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-700 pt-4 space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            This page is intentionally empty in Phase 0. In Phase 2 it will
            include:
          </p>
          <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 list-disc pl-5">
            <li>
              A free-form text editor with a <code>Check My Writing</code> button
            </li>
            <li>
              Side-by-side original vs corrected text panels with wavy underlines
            </li>
            <li>The Teacher's Desk — explanation cards grouped by mistake type</li>
            <li>A loading state with progress messages from the Edge Function</li>
            <li>
              A live Gemini API call routed through the{" "}
              <code>analyze-text</code> Edge Function
            </li>
          </ul>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-700 pt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Sparkles className="w-4 h-4 text-brand-500" />
          The structured JSON contract for Gemini is already defined in{" "}
          <code>src/lib/analysis.js</code>.
        </div>
      </Card>
    </div>
  );
}
