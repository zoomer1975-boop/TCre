import { CheckCircle2, Shuffle, ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { StatusBadge, TextBadge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { canAccessRole, contributionTypeLabels } from "@/lib/domain";
import { createUserNameLookup } from "@/lib/lookups";
import { getCurrentUser } from "@/lib/providers/identity";
import {
  listAppeals,
  listCommitteeReviews,
  listContributions,
  listRecommendations,
  listUsers
} from "@/lib/server/tcredit-repository";

export default async function CommitteePage() {
  const [currentUser, committeeReviews, contributions, recommendations, appeals, users] = await Promise.all([
    getCurrentUser(),
    listCommitteeReviews(),
    listContributions(),
    listRecommendations(),
    listAppeals(),
    listUsers()
  ]);
  if (!canAccessRole(currentUser, "COMMITTEE")) {
    notFound();
  }

  const userNames = createUserNameLookup(users);
  const openReviews = committeeReviews.filter((review) => review.status !== "CLOSED");
  const privateComments = recommendations.filter((recommendation) => recommendation.isPrivate);

  return (
    <>
      <PageHeader
        eyebrow="Committee Review"
        title="위원회 심의"
        description="승인 활동 중 이상 사례, 반려 이의신청, 비공개 의견, 무작위 표본감사 대상을 확인합니다."
      />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="심의 대기" value={`${openReviews.length}건`} detail="이상 징후 및 이의신청" />
        <StatCard label="비공개 의견" value={`${privateComments.length}건`} detail="위원회 검토자료" />
        <StatCard label="표본감사" value="10%" detail="시범운영 기본 표본율" />
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-line bg-white shadow-soft">
          <div className="flex items-center gap-2 border-b border-line px-5 py-4">
            <ShieldAlert className="size-5 text-campus" aria-hidden="true" />
            <h2 className="text-lg font-bold text-ink">이상 사례 큐</h2>
          </div>
          <div className="divide-y divide-line">
            {committeeReviews.map((review) => {
              const contribution = contributions.find((item) => item.id === review.contributionId);
              if (!contribution) return null;

              return (
                <article key={review.id} className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <TextBadge tone={review.severity === "높음" ? "warning" : "default"}>{review.signalType}</TextBadge>
                    <TextBadge>{review.status}</TextBadge>
                    <StatusBadge status={contribution.status} />
                  </div>
                  <h3 className="mt-3 font-bold text-ink">{contribution.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{contribution.description}</p>
                  <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                    <div className="rounded-md bg-slate-50 p-3">
                      <dt className="text-muted">공헌자</dt>
                      <dd className="mt-1 font-semibold text-ink">{userNames[contribution.contributorId] ?? contribution.contributorId}</dd>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <dt className="text-muted">유형</dt>
                      <dd className="mt-1 font-semibold text-ink">{contributionTypeLabels[contribution.type]}</dd>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <dt className="text-muted">검토 메모</dt>
                      <dd className="mt-1 font-semibold text-ink">{review.note}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </div>
        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <Shuffle className="size-5 text-campus" aria-hidden="true" />
              <h2 className="text-lg font-bold text-ink">무작위 표본감사</h2>
            </div>
            <div className="mt-4 space-y-3">
              {contributions.slice(0, 3).map((contribution) => (
                <div key={contribution.id} className="flex items-start justify-between gap-3 rounded-md bg-slate-50 p-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{contribution.title}</p>
                    <p className="mt-1 text-xs text-muted">{userNames[contribution.contributorId] ?? contribution.contributorId}</p>
                  </div>
                  <TextBadge>{contribution.expectedCredit} C</TextBadge>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-campus" aria-hidden="true" />
              <h2 className="text-lg font-bold text-ink">이의신청</h2>
            </div>
            <div className="mt-4 space-y-3">
              {appeals.map((appeal) => {
                const contribution = contributions.find((item) => item.id === appeal.contributionId);
                return (
                  <div key={appeal.id} className="rounded-md border border-line p-3">
                    <p className="text-sm font-semibold text-ink">{contribution?.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted">{appeal.reason}</p>
                    <TextBadge tone="warning">{appeal.status}</TextBadge>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
