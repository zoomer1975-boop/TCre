import Link from "next/link";
import { ArrowRight, FilePlus2 } from "lucide-react";
import { ContributionTable } from "@/components/ContributionTable";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { formatNumber } from "@/lib/domain";
import { createOrgNameLookup, createUserNameLookup } from "@/lib/lookups";
import { getCurrentUser } from "@/lib/providers/identity";
import {
  getBudgetPool,
  listApprovals,
  listContributions,
  listOrgUnits,
  listRecommendations,
  listUsers
} from "@/lib/server/tcredit-repository";

export default async function DashboardPage() {
  const [currentUser, contributions, approvals, budgetPool, users, orgUnits, recommendations] = await Promise.all([
    getCurrentUser(),
    listContributions(),
    listApprovals(),
    getBudgetPool(),
    listUsers(),
    listOrgUnits(),
    listRecommendations()
  ]);
  const userNames = createUserNameLookup(users);
  const orgNames = createOrgNameLookup(orgUnits);
  const approved = contributions.filter((item) => item.status === "APPROVED");
  const pending = contributions.filter((item) => item.status === "PENDING_APPROVAL");
  const issuedRate = Math.round((budgetPool.issuedCredit / budgetPool.issuedCreditLimit) * 1000) / 10;
  const assignedRecommendationContributionIds = new Set(
    recommendations.filter((item) => item.recommenderId === currentUser.id).map((item) => item.contributionId)
  );
  const isOwnOrAssignedRecommendation = (contributionId: string, contributorId: string) =>
    contributorId === currentUser.id || assignedRecommendationContributionIds.has(contributionId);
  const visibleContributions = currentUser.roles.includes("ADMIN")
    ? contributions
    : currentUser.roles.includes("APPROVER")
      ? contributions.filter(
          (item) =>
            item.relatedOrgUnitCode === currentUser.orgUnitCode &&
            (item.status !== "PENDING_RECOMMEND" || isOwnOrAssignedRecommendation(item.id, item.contributorId))
        )
      : contributions.filter((item) => item.contributorId === currentUser.id);

  return (
    <>
      <PageHeader
        eyebrow="대학혁신지원사업 시범운영"
        title="T-Credit 운영 현황"
        description="공헌 입력, 추천, 승인, 위원회 심의까지 한 화면 흐름으로 확인하는 MVP입니다."
        actions={
          <Link
            href="/contributions/new"
            className="inline-flex items-center gap-2 rounded-md bg-campus px-4 py-2 text-sm font-semibold text-white hover:bg-campus-ink"
          >
            <FilePlus2 className="size-4" aria-hidden="true" />
            공헌 입력
          </Link>
        }
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="승인 Credit" value={`${formatNumber(budgetPool.issuedCredit)} C`} detail={`발행 한도 대비 ${issuedRate}%`} />
        <StatCard label="승인 완료" value={`${approved.length}건`} detail="즉시 공헌 내역에 반영" />
        <StatCard label="승인 대기" value={`${pending.length}건`} detail="추천 및 승인권자 검토 필요" />
      </section>
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">최근 공헌 로그</h2>
          <Link href="/contributions/mine" className="inline-flex items-center gap-1 text-sm font-semibold text-campus">
            전체 보기
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <ContributionTable rows={visibleContributions} approvals={approvals} userNames={userNames} orgNames={orgNames} />
      </section>
    </>
  );
}
