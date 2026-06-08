import { StatusBadge, TextBadge } from "@/components/Badge";
import { StatusHelpPopover } from "@/components/StatusHelpPopover";
import {
  Contribution,
  Approval,
  contributionTypeLabels,
  tierLabels,
  formatNumber
} from "@/lib/domain";

export function ContributionTable({
  rows,
  approvals,
  userNames,
  orgNames,
  showContributor = true,
  containerClassName = "table-scroll rounded-lg border border-line bg-white shadow-soft",
  emptyMessage = "표시할 공헌 내역이 없습니다."
}: {
  rows: Contribution[];
  approvals: Approval[];
  userNames: Record<string, string>;
  orgNames: Record<string, string>;
  showContributor?: boolean;
  containerClassName?: string;
  emptyMessage?: string;
}) {
  const columnCount = showContributor ? 6 : 5;

  return (
    <div className={containerClassName}>
      <table className="min-w-full divide-y divide-line text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-normal text-muted">
          <tr>
            <th className="px-4 py-3">공헌</th>
            {showContributor ? <th className="px-4 py-3">공헌자</th> : null}
            <th className="px-4 py-3">유형</th>
            <th className="px-4 py-3">관련 부서</th>
            <th className="px-4 py-3">
              <span className="inline-flex items-center gap-1.5">
                상태
                <StatusHelpPopover />
              </span>
            </th>
            <th className="px-4 py-3">Credit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length > 0 ? rows.map((row) => {
            const approval = approvals.find((item) => item.contributionId === row.id);

            return (
              <tr key={row.id} className="align-top">
                <td className="max-w-md px-4 py-4">
                  <p className="font-semibold text-ink">{row.title}</p>
                  <details className="group mt-1">
                    <summary className="cursor-pointer list-none rounded-sm text-muted outline-none focus-visible:ring-2 focus-visible:ring-campus/30">
                      <span className="line-clamp-2 group-open:hidden">{row.description}</span>
                      <span className="hidden whitespace-pre-line group-open:block">{row.description}</span>
                    </summary>
                  </details>
                  <p className="mt-2 text-xs text-muted">활동일 {row.activityDate}</p>
                </td>
                {showContributor ? (
                  <td className="px-4 py-4 font-medium text-ink">{userNames[row.contributorId] ?? row.contributorId}</td>
                ) : null}
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-2">
                    <TextBadge tone="campus">{contributionTypeLabels[row.type]}</TextBadge>
                    <span className="text-xs text-muted">{tierLabels[row.requestedTier]}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-muted">{orgNames[row.relatedOrgUnitCode] ?? row.relatedOrgUnitCode}</td>
                <td className="px-4 py-4">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-4 font-bold text-ink">
                  {formatNumber(approval?.finalCredit ?? row.expectedCredit)} C
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={columnCount} className="px-4 py-10 text-center text-sm text-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
