import { Card } from "./Card";
import { IconBadge } from "./IconBadge";

const toneClasses = {
  brand: "bg-brand-50 text-brand-500 dark:bg-brand-500/10",
  emerald: "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10",
  red: "bg-red-50 text-red-500 dark:bg-red-500/10",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10",
  indigo: "bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10",
};

export function StatCard({ label, value, sublabel, icon, tone = "brand" }) {
  return (
    <Card padded={false} className="p-6 flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {label}
        </p>
        <p className="text-3xl font-black text-slate-900 dark:text-white">
          {value}
        </p>
        {sublabel ? (
          <p className="text-[10px] font-bold text-slate-400">{sublabel}</p>
        ) : null}
      </div>
      <IconBadge tone={tone} size="md">
        {icon}
      </IconBadge>
    </Card>
  );
}
