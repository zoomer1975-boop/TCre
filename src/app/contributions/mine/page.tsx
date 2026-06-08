import { Sparkles } from "lucide-react";
import Link from "next/link";
import { StatusBadge, TextBadge } from "@/components/Badge";
import { ContributionTable } from "@/components/ContributionTable";
import { PageHeader } from "@/components/PageHeader";
import { RecommendationCommentForm } from "@/components/RecommendationCommentForm";
import { StatCard } from "@/components/StatCard";
import { contributionTypeLabels, formatNumber } from "@/lib/domain";
import { createOrgNameLookup, createUserNameLookup } from "@/lib/lookups";
import { getCurrentUser } from "@/lib/providers/identity";
import {
  listApprovals,
  listContributions,
  listOrgUnits,
  listRecommendations,
  listUsers
} from "@/lib/server/tcredit-repository";

const PAGE_SIZE = 5;

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function buildPageHref(params: {
  q: string;
  dateFrom: string;
  dateTo: string;
  page: number;
}) {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.page > 1) searchParams.set("page", String(params.page));
  const query = searchParams.toString();

  return query ? `/contributions/mine?${query}` : "/contributions/mine";
}

export default async function MinePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const q = readParam(resolvedSearchParams.q).trim();
  const dateFrom = readParam(resolvedSearchParams.dateFrom);
  const dateTo = readParam(resolvedSearchParams.dateTo);
  const requestedPage = Number.parseInt(readParam(resolvedSearchParams.page), 10);
  const user = await getCurrentUser();
  const [contributions, approvals, recommendations, users, orgUnits] = await Promise.all([
    listContributions(),
    listApprovals(),
    listRecommendations(),
    listUsers(),
    listOrgUnits()
  ]);
  const userNames = createUserNameLookup(users);
  const orgNames = createOrgNameLookup(orgUnits);
  const myContributions = contributions.filter((item) => item.contributorId === user.id);
  const normalizedQuery = q.toLowerCase();
  const filteredContributions = myContributions.filter((item) => {
    const matchesDateFrom = dateFrom ? item.activityDate >= dateFrom : true;
    const matchesDateTo = dateTo ? item.activityDate <= dateTo : true;
    const searchableText = [
      item.title,
      item.description,
      contributionTypeLabels[item.type],
      orgNames[item.relatedOrgUnitCode] ?? item.relatedOrgUnitCode,
      item.status
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = normalizedQuery ? searchableText.includes(normalizedQuery) : true;

    return matchesDateFrom && matchesDateTo && matchesQuery;
  });
  const totalPages = Math.max(1, Math.ceil(filteredContributions.length / PAGE_SIZE));
  const currentPage = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedContributions = filteredContributions.slice(pageStart, pageStart + PAGE_SIZE);
  const resultStart = filteredContributions.length > 0 ? pageStart + 1 : 0;
  const resultEnd = Math.min(pageStart + PAGE_SIZE, filteredContributions.length);
  const myApprovedCredit = myContributions.reduce((sum, contribution) => {
    const approval = approvals.find((item) => item.contributionId === contribution.id);
    return sum + (approval?.finalCredit ?? 0);
  }, 0);
  const assignedRecommendations = recommendations.filter(
    (item) => item.recommenderId === user.id && item.status === "REQUESTED"
  );
  const assignedContributionIds = new Set(assignedRecommendations.map((item) => item.contributionId));
  const assignedContributions = contributions.filter((item) => assignedContributionIds.has(item.id));

  return (
    <>
      <PageHeader
        eyebrow={user.name}
        title="공헌 내역"
        description="본인의 공헌 내용, 추천 의견, 승인 결과, 이의신청 상태를 연말 평가 자료 형태로 확인합니다."
      />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="누적 승인 Credit" value={`${formatNumber(myApprovedCredit)} C`} detail="" />
        <StatCard label="입력 공헌" value={`${myContributions.length}건`} detail="" />
        <StatCard label="추천 요청" value={`${assignedRecommendations.length}건`} detail="" />
      </section>
      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 size-5 text-gold" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-bold text-ink">AI 요약 초안 (구현 예정)</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {myContributions.length > 0
                ? `${user.name} 구성원은 입력된 공헌 기록을 기준으로 부서 간 협업, 업무 개선, 일정 준수 기여를 요약할 수 있습니다. LLM 연동 전까지는 규칙 기반 초안으로 표시합니다.`
                : "아직 본인 공헌 입력이 없습니다. 새 공헌을 입력하면 이 영역에 규칙 기반 요약 초안이 표시됩니다."}
            </p>
          </div>
        </div>
      </section>
      <section className="mt-6 rounded-lg border border-line bg-white shadow-soft">
        <div className="flex flex-col gap-4 border-b border-line p-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">공헌 입력 건별 요약</h2>
            <p className="mt-1 text-sm text-muted">
              총 {formatNumber(filteredContributions.length)}건 중 {formatNumber(resultStart)}-{formatNumber(resultEnd)}건 표시
            </p>
          </div>
          <form className="grid gap-2 md:grid-cols-[150px_150px_minmax(180px,260px)_auto_auto]">
            <label>
              <span className="sr-only">시작일</span>
              <input
                type="date"
                name="dateFrom"
                defaultValue={dateFrom}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="sr-only">종료일</span>
              <input
                type="date"
                name="dateTo"
                defaultValue={dateTo}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="sr-only">검색어</span>
              <input
                name="q"
                defaultValue={q}
                placeholder="제목, 내용, 부서, 유형 검색"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
              />
            </label>
            <button className="rounded-md bg-campus px-4 py-2 text-sm font-semibold text-white hover:bg-campus-ink">
              검색
            </button>
            <Link
              href="/contributions/mine"
              className="inline-flex items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-slate-50"
            >
              초기화
            </Link>
          </form>
        </div>
        <ContributionTable
          rows={pagedContributions}
          approvals={approvals}
          userNames={userNames}
          orgNames={orgNames}
          showContributor={false}
          containerClassName="table-scroll"
          emptyMessage="검색 조건에 맞는 공헌 내역이 없습니다."
        />
        <div className="flex flex-col gap-3 border-t border-line bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            페이지 {formatNumber(currentPage)} / {formatNumber(totalPages)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildPageHref({ q, dateFrom, dateTo, page: currentPage - 1 })}
              aria-disabled={currentPage <= 1}
              className={`inline-flex min-w-20 items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold ${
                currentPage <= 1
                  ? "pointer-events-none border-line bg-slate-50 text-slate-400"
                  : "border-line bg-white text-ink hover:bg-slate-50"
              }`}
            >
              이전
            </Link>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <Link
                key={pageNumber}
                href={buildPageHref({ q, dateFrom, dateTo, page: pageNumber })}
                className={`inline-flex size-9 items-center justify-center rounded-md border text-sm font-bold ${
                  pageNumber === currentPage
                    ? "border-campus bg-campus text-white"
                    : "border-line bg-white text-ink hover:bg-slate-50"
                }`}
              >
                {pageNumber}
              </Link>
            ))}
            <Link
              href={buildPageHref({ q, dateFrom, dateTo, page: currentPage + 1 })}
              aria-disabled={currentPage >= totalPages}
              className={`inline-flex min-w-20 items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold ${
                currentPage >= totalPages
                  ? "pointer-events-none border-line bg-slate-50 text-slate-400"
                  : "border-line bg-white text-ink hover:bg-slate-50"
              }`}
            >
              다음
            </Link>
          </div>
        </div>
      </section>
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-ink">추천 의견 입력</h2>
        {assignedContributions.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {assignedContributions.map((contribution) => {
              const recommendation = assignedRecommendations.find((item) => item.contributionId === contribution.id);
              if (!recommendation) return null;

              return (
                <article key={recommendation.id} className="rounded-lg border border-line bg-white p-5 shadow-soft">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={contribution.status} />
                    <TextBadge tone="campus">{contributionTypeLabels[contribution.type]}</TextBadge>
                    <TextBadge tone="warning">의견 입력 대기</TextBadge>
                    {recommendation.isPrivate ? <TextBadge tone="warning">비공개</TextBadge> : null}
                  </div>
                  <h3 className="mt-3 font-bold text-ink">{contribution.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{contribution.description}</p>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-md bg-slate-50 p-3">
                      <dt className="text-muted">공헌자</dt>
                      <dd className="mt-1 font-semibold text-ink">{userNames[contribution.contributorId] ?? contribution.contributorId}</dd>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <dt className="text-muted">관련 부서</dt>
                      <dd className="mt-1 font-semibold text-ink">{orgNames[contribution.relatedOrgUnitCode] ?? contribution.relatedOrgUnitCode}</dd>
                    </div>
                  </dl>
                  <RecommendationCommentForm
                    recommendationId={recommendation.id}
                    defaultComment={recommendation.comment}
                    defaultIsPrivate={recommendation.isPrivate}
                  />
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-line bg-white p-5 text-sm text-muted shadow-soft">
            현재 입력 대기 중인 추천 의견이 없습니다.
          </div>
        )}
      </section>
    </>
  );
}
