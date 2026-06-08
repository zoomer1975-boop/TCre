import { AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { ApprovalHistoryTable, ApprovalHistoryRow } from "@/components/ApprovalHistoryTable";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Approval, Contribution, User, canAccessRole, contributionTypeLabels, formatNumber } from "@/lib/domain";
import { createUserNameLookup } from "@/lib/lookups";
import { getCurrentUser } from "@/lib/providers/identity";
import { listApprovals, listContributions, listUsers } from "@/lib/server/tcredit-repository";

type MonthlyApprovalSummary = {
  key: string;
  label: string;
  count: number;
  width: number;
};

function canSeeAllApprovals(user: User) {
  return user.roles.includes("ADMIN");
}

function filterApprovalsForUser(approvals: Approval[], user: User) {
  if (canSeeAllApprovals(user)) {
    return approvals;
  }

  return approvals.filter((approval) => approval.approverId === user.id);
}

function filterPendingContributionsForUser(contributions: Contribution[], user: User) {
  return contributions.filter(
    (contribution) =>
      contribution.status === "PENDING_APPROVAL" &&
      (canSeeAllApprovals(user) || contribution.relatedOrgUnitCode === user.orgUnitCode)
  );
}

function buildMonthlyApprovalSummaries(approvals: Approval[]): MonthlyApprovalSummary[] {
  const counts = approvals.reduce<Map<string, number>>((result, approval) => {
    const date = new Date(approval.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    result.set(key, (result.get(key) ?? 0) + 1);
    return result;
  }, new Map());

  const maxCount = Math.max(...counts.values(), 0);

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => {
      const [year, month] = key.split("-");

      return {
        key,
        label: `${year}년 ${Number(month)}월`,
        count,
        width: maxCount > 0 ? Math.max(8, Math.round((count / maxCount) * 100)) : 0
      };
    });
}

function buildAutomaticWarnings({
  approvals,
  contributions,
  pendingContributions,
  userNames
}: {
  approvals: Approval[];
  contributions: Contribution[];
  pendingContributions: Contribution[];
  userNames: Record<string, string>;
}) {
  const warnings: string[] = [];
  const contributionById = new Map(contributions.map((contribution) => [contribution.id, contribution]));
  const approved = approvals.filter((approval) => approval.decision === "APPROVED");
  const rejected = approvals.filter((approval) => approval.decision === "REJECTED");
  const approvalRate = approvals.length > 0 ? Math.round((approved.length / approvals.length) * 100) : 0;

  if (approvals.length >= 3 && approvalRate < 50) {
    warnings.push(`승인율이 ${approvalRate}%로 50% 미만입니다.`);
  }

  if (approvals.length >= 3) {
    const rejectionRate = Math.round((rejected.length / approvals.length) * 100);
    if (rejectionRate >= 30) {
      warnings.push(`반려 비중이 ${rejectionRate}%로 높습니다.`);
    }
  }

  const approvedByContributor = approved.reduce<Map<string, number>>((result, approval) => {
    const contribution = contributionById.get(approval.contributionId);
    if (!contribution) {
      return result;
    }

    result.set(contribution.contributorId, (result.get(contribution.contributorId) ?? 0) + 1);
    return result;
  }, new Map());
  const topContributor = [...approvedByContributor.entries()].sort(([, left], [, right]) => right - left)[0];

  if (topContributor && approved.length > 0) {
    const [contributorId, count] = topContributor;
    const concentrationRate = Math.round((count / approved.length) * 100);
    if (concentrationRate >= 40) {
      warnings.push(
        `승인 결과가 ${userNames[contributorId] ?? contributorId} 공헌자에게 ${concentrationRate}% 집중되어 있습니다.`
      );
    }
  }

  const monthlySummaries = buildMonthlyApprovalSummaries(approvals);
  if (monthlySummaries.length >= 2) {
    const average = approvals.length / monthlySummaries.length;
    const spike = monthlySummaries.find((summary) => summary.count >= 2 && summary.count >= average * 1.5);
    if (spike) {
      warnings.push(`${spike.label} 승인 처리량이 월평균 대비 높습니다.`);
    }
  }

  if (pendingContributions.length > 0) {
    warnings.push(`현재 승인 대기 공헌이 ${formatNumber(pendingContributions.length)}건 있습니다.`);
  }

  return warnings;
}

export default async function ApproverInsightsPage() {
  const [currentUser, approvals, contributions, users] = await Promise.all([
    getCurrentUser(),
    listApprovals(),
    listContributions(),
    listUsers()
  ]);
  if (!canAccessRole(currentUser, "APPROVER")) {
    notFound();
  }

  const userNames = createUserNameLookup(users);
  const scopedApprovals = filterApprovalsForUser(approvals, currentUser);
  const pendingContributions = filterPendingContributionsForUser(contributions, currentUser);
  const monthlySummaries = buildMonthlyApprovalSummaries(scopedApprovals);
  const automaticWarnings = buildAutomaticWarnings({
    approvals: scopedApprovals,
    contributions,
    pendingContributions,
    userNames
  });
  const approvalRate =
    scopedApprovals.length > 0
      ? Math.round((scopedApprovals.filter((item) => item.decision === "APPROVED").length / scopedApprovals.length) * 100)
      : 0;
  const totalCredit = scopedApprovals.reduce((sum, item) => sum + item.finalCredit, 0);
  const rejected = scopedApprovals.filter((item) => item.decision === "REJECTED").length;
  const contributionById = new Map(contributions.map((contribution) => [contribution.id, contribution]));
  const historyRows = scopedApprovals.reduce<ApprovalHistoryRow[]>((result, approval) => {
    const contribution = contributionById.get(approval.contributionId);
    if (!contribution) {
      return result;
    }

    result.push({
      id: approval.id,
      title: contribution.title,
      description: contribution.description,
      contributorName: userNames[contribution.contributorId] ?? contribution.contributorId,
      typeLabel: contributionTypeLabels[contribution.type],
      decision: approval.decision,
      finalCredit: approval.finalCredit
    });
    return result;
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Approval Analytics"
        title="승인자별 조회"
        description="월별 승인 처리 현황, 승인율, 유형 분포, 특정 공헌자 집중도를 위원회 점검자료 형태로 제공합니다."
      />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="승인율" value={`${approvalRate}%`} detail={`DB 승인/반려 ${formatNumber(scopedApprovals.length)}건 기준`} />
        <StatCard label="발행 Credit" value={`${formatNumber(totalCredit)} C`} detail="승인 결정 기준 누적" />
        <StatCard label="반려 건수" value={`${formatNumber(rejected)}건`} detail="DB 반려 결정 기준" />
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <h2 className="text-lg font-bold text-ink">월별 승인 처리 현황</h2>
          {monthlySummaries.length > 0 ? (
            <div className="mt-5 space-y-4">
              {monthlySummaries.map((summary) => (
                <div key={summary.key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink">{summary.label}</span>
                    <span className="text-muted">{formatNumber(summary.count)}건</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-campus" style={{ width: `${summary.width}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-md bg-slate-50 p-3 text-sm text-muted">처리된 승인/반려 내역이 없습니다.</p>
          )}
        </div>
        <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <h2 className="text-lg font-bold text-ink">참고 사항</h2>
          {automaticWarnings.length > 0 ? (
            <div className="mt-4 space-y-3">
              {automaticWarnings.map((text) => (
                <div key={text} className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
                  <p className="text-sm leading-6 text-amber-900">{text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-muted">특이 사항이 없습니다.</p>
          )}
        </div>
      </section>
      <section className="mt-6 rounded-lg border border-line bg-white shadow-soft">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold text-ink">승인 내역</h2>
        </div>
        <ApprovalHistoryTable rows={historyRows} />
      </section>
    </>
  );
}
