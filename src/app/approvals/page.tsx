import { ApprovalWorkbench } from "@/components/ApprovalWorkbench";
import { PageHeader } from "@/components/PageHeader";
import { canApproveContribution } from "@/lib/domain";
import { createOrgNameLookup, createUserNameLookup } from "@/lib/lookups";
import { getCurrentUser } from "@/lib/providers/identity";
import { listContributions, listOrgUnits, listRecommendations, listUsers } from "@/lib/server/tcredit-repository";

export default async function ApprovalsPage() {
  const [currentUser, contributions, recommendations, users, orgUnits] = await Promise.all([
    getCurrentUser(),
    listContributions(),
    listRecommendations(),
    listUsers(),
    listOrgUnits()
  ]);
  const userNames = createUserNameLookup(users);
  const orgNames = createOrgNameLookup(orgUnits);
  const target = contributions.find((item) => canApproveContribution(currentUser, item));

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

  const targetRecommendations = recommendations.filter((item) => item.contributionId === target.id);

  return (
    <>
      <PageHeader
        eyebrow="Approver"
        title="승인 처리"
        description="승인권자는 추천 내용을 확인하고 참여, 성과, 효과 점수와 Effort Tier를 조정해 최종 Credit을 부여합니다."
      />
      <ApprovalWorkbench
        contribution={target}
        recommendations={targetRecommendations}
        contributorName={userNames[target.contributorId] ?? target.contributorId}
        relatedOrgName={orgNames[target.relatedOrgUnitCode] ?? target.relatedOrgUnitCode}
        recommenderNames={userNames}
      />
    </>
  );
}
