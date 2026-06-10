import Link from "next/link";
import { notFound } from "next/navigation";
import { ApprovalWorkbench } from "@/components/ApprovalWorkbench";
import { PageHeader } from "@/components/PageHeader";
import { TextBadge } from "@/components/Badge";
import { canAccessRole, contributionTypeLabels, formatNumber, tierLabels } from "@/lib/domain";
import { createOrgNameLookup, createUserNameLookup } from "@/lib/lookups";
import { getCurrentUser } from "@/lib/providers/identity";
import { listContributions, listOrgUnits, listRecommendations, listUsers } from "@/lib/server/tcredit-repository";

export default async function ApprovalsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentUser = await getCurrentUser();

  if (!canAccessRole(currentUser, "APPROVER")) {
    notFound();
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedIdParam = resolvedSearchParams.id;
  const selectedId = Array.isArray(selectedIdParam) ? selectedIdParam[0] : selectedIdParam;
  const [pendingContributions, users, orgUnits] = await Promise.all([
    listContributions({
      status: "PENDING_APPROVAL",
      ...(currentUser.roles.includes("ADMIN") ? {} : { relatedOrgUnitCode: currentUser.orgUnitCode })
    }),
    listUsers(),
    listOrgUnits()
  ]);
  const userNames = createUserNameLookup(users);
  const orgNames = createOrgNameLookup(orgUnits);
  const target = pendingContributions.find((item) => item.id === selectedId) ?? pendingContributions[0];

  if (!target) {
    return (
      <>
        <PageHeader
          eyebrow="Approver"
          title="승인 처리"
          description="승인권자는 추천 내용을 확인하고 참여, 성과, 효과 점수와 Effort Tier를 조정해 최종 Credit을 부여합니다."
        />
        <div className="rounded-lg border border-line bg-white p-6 text-sm text-muted shadow-soft">
          현재 승인 처리할 수 있는 공헌이 없습니다.
        </div>
      </>
    );
  }

  const targetRecommendations = await listRecommendations({ contributionId: target.id });

  return (
    <>
      <PageHeader
        eyebrow="Approver"
        title="승인 처리"
        description="승인권자는 추천 내용을 확인하고 참여, 성과, 효과 점수와 Effort Tier를 조정해 최종 Credit을 부여합니다."
      />
      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <aside className="rounded-lg border border-line bg-white shadow-soft xl:self-start">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-bold text-ink">승인 대기 목록</h2>
            <TextBadge tone="warning">{formatNumber(pendingContributions.length)}건</TextBadge>
          </div>
          <ul className="max-h-[32rem] divide-y divide-line overflow-y-auto">
            {pendingContributions.map((item) => {
              const isSelected = item.id === target.id;

              return (
                <li key={item.id}>
                  <Link
                    href={`/approvals?id=${item.id}`}
                    aria-current={isSelected ? "true" : undefined}
                    className={`block px-4 py-3 transition ${
                      isSelected ? "border-l-2 border-campus bg-emerald-50/60" : "border-l-2 border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <p className={`truncate text-sm font-semibold ${isSelected ? "text-campus-ink" : "text-ink"}`}>
                      {item.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted">
                      {userNames[item.contributorId] ?? item.contributorId} · {contributionTypeLabels[item.type]} ·{" "}
                      {tierLabels[item.requestedTier]}
                    </p>
                    <p className="mt-1 text-xs text-muted">활동일 {item.activityDate}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>
        <ApprovalWorkbench
          key={target.id}
          contribution={target}
          recommendations={targetRecommendations}
          contributorName={userNames[target.contributorId] ?? target.contributorId}
          relatedOrgName={orgNames[target.relatedOrgUnitCode] ?? target.relatedOrgUnitCode}
          recommenderNames={userNames}
        />
      </div>
    </>
  );
}
