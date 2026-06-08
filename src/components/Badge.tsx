import { ContributionStatus, statusLabels } from "@/lib/domain";

const statusTone: Record<ContributionStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  PENDING_RECOMMEND: "bg-blue-50 text-blue-700 ring-blue-200",
  PENDING_APPROVAL: "bg-amber-50 text-amber-800 ring-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
  UNBILLABLE: "bg-zinc-100 text-zinc-700 ring-zinc-300",
  UNDER_REVIEW: "bg-violet-50 text-violet-700 ring-violet-200"
};

export function StatusBadge({ status }: { status: ContributionStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusTone[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

export function TextBadge({
  children,
  tone = "default"
}: {
  children: React.ReactNode;
  tone?: "default" | "campus" | "warning";
}) {
  const className = {
    default: "bg-slate-100 text-slate-700 ring-slate-200",
    campus: "bg-emerald-50 text-campus ring-emerald-200",
    warning: "bg-amber-50 text-amber-800 ring-amber-200"
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${className}`}>
      {children}
    </span>
  );
}
