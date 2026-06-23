import { History, Trash2 } from "lucide-react";
import { Card } from "../components/Card";
import { Pill } from "../components/Pill";
import { Button } from "../components/Button";

/** Phase 4 placeholder. Real history comes from analysis_logs. */
export function HistoryPage() {
  return (
    <div className="py-6 px-6 max-w-6xl mx-auto space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 text-slate-500 rounded-2xl dark:bg-slate-700 dark:text-slate-300">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                Writing History Logs
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review and reference previous analysis sessions.
              </p>
            </div>
            <Pill color="amber" className="ml-2">
              Phase 4
            </Pill>
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            disabled
          >
            Clear All History
          </Button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-4 mt-4">
          In Phase 4, this page will be populated by querying the{" "}
          <code>analysis_logs</code> table for the current user. Each row will
          link back to a specific past analysis session.
        </p>
      </Card>
    </div>
  );
}
