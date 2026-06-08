"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Plus, Send, X } from "lucide-react";
import { createContributionAction } from "@/app/contributions/actions";
import {
  ContributionType,
  EffortTier,
  OrgUnit,
  User,
  calculateCredit,
  contributionTypeDescriptions,
  contributionTypeLabels,
  isSubmittedWithin30Days,
  tierDetails,
  tierLabels
} from "@/lib/domain";

const contributionTypes = Object.keys(contributionTypeLabels) as ContributionType[];
const tiers = Object.keys(tierLabels) as EffortTier[];
const initialContributionActionState = {
  status: "idle" as const,
  message: ""
};

export function ContributionForm({
  orgUnits,
  users,
  currentUserId,
  today
}: {
  orgUnits: OrgUnit[];
  users: User[];
  currentUserId: string;
  today: string;
}) {
  const [actionState, formAction, isPending] = useActionState(createContributionAction, initialContributionActionState);
  const [activityDate, setActivityDate] = useState("");
  const [type, setType] = useState<ContributionType | "">("");
  const [relatedOrgUnitCode, setRelatedOrgUnitCode] = useState("");
  const [tier, setTier] = useState<EffortTier | "">("");
  const [recommenderSelectValue, setRecommenderSelectValue] = useState("");
  const [selectedRecommenderIds, setSelectedRecommenderIds] = useState<string[]>([]);

  const within30Days = useMemo(
    () => (activityDate ? isSubmittedWithin30Days(new Date(activityDate), new Date(today)) : undefined),
    [activityDate]
  );
  const expectedCredit = tier ? calculateCredit(1, 1, 1, tier) : 0;
  const selectedTierDetail = tier ? tierDetails[tier] : undefined;
  const orgNames = useMemo(
    () => Object.fromEntries(orgUnits.map((org) => [org.code, org.name])),
    [orgUnits]
  );
  const availableRecommenders = useMemo(
    () => users.filter((user) => user.id !== currentUserId && !selectedRecommenderIds.includes(user.id)),
    [currentUserId, selectedRecommenderIds, users]
  );
  const selectedRecommenders = useMemo(
    () => users.filter((user) => selectedRecommenderIds.includes(user.id)),
    [selectedRecommenderIds, users]
  );

  function updateRelatedOrgUnit(nextOrgUnitCode: string) {
    setRelatedOrgUnitCode(nextOrgUnitCode);
  }

  function addRecommender() {
    if (!recommenderSelectValue) return;
    setSelectedRecommenderIds((previous) =>
      previous.includes(recommenderSelectValue) ? previous : [...previous, recommenderSelectValue]
    );
    setRecommenderSelectValue("");
  }

  function removeRecommender(userId: string) {
    setSelectedRecommenderIds((previous) => previous.filter((item) => item !== userId));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <form className="rounded-lg border border-line bg-white p-5 shadow-soft" action={formAction}>
        <input type="hidden" name="inputScore" value="1" />
        <input type="hidden" name="outcomeScore" value="1" />
        <input type="hidden" name="impactScore" value="1" />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="text-sm font-semibold text-ink">공헌 제목</span>
            <input
              required
              name="title"
              maxLength={255}
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="text-sm font-semibold text-ink">공헌 유형</span>
            <select
              name="type"
              required
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
              value={type}
              onChange={(event) => setType(event.target.value as ContributionType | "")}
            >
              <option value="">선택</option>
              {contributionTypes.map((item) => (
                <option key={item} value={item}>
                  {contributionTypeLabels[item]} · {contributionTypeDescriptions[item]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-semibold text-ink">활동일</span>
            <input
              required
              name="activityDate"
              type="date"
              max={today}
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
              value={activityDate}
              onChange={(event) => setActivityDate(event.target.value)}
            />
          </label>
          <label>
            <span className="text-sm font-semibold text-ink">관련 부서</span>
            <select
              name="relatedOrgUnitCode"
              required
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
              value={relatedOrgUnitCode}
              onChange={(event) => updateRelatedOrgUnit(event.target.value)}
            >
              <option value="">선택</option>
              {orgUnits
                .filter((org) => org.code !== "KMU")
                .map((org) => (
                  <option key={org.code} value={org.code}>
                    {org.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-semibold text-ink">Effort Tier</span>
            <select
              name="requestedTier"
              required
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
              value={tier}
              onChange={(event) => setTier(event.target.value as EffortTier | "")}
            >
              <option value="">선택</option>
              {tiers.map((item) => (
                <option key={item} value={item}>
                  {tierLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="md:col-span-2">
            <span className="text-sm font-semibold text-ink">공헌 내용</span>
            <textarea
              required
              name="description"
              rows={6}
              className="mt-2 w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm leading-6"
            />
          </label>
        </div>
        <fieldset className="mt-5 rounded-md border border-line p-4">
          <legend className="px-1 text-sm font-semibold text-ink">동료추천인(선택)</legend>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted">
              회원 명단에서 추천인을 선택해 추가합니다. 추천인은 공헌 제출 후 추천 의견 또는 위원회용 비공개 의견을 입력할 수 있습니다.
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <select
              name="recommenderIds"
              value={recommenderSelectValue}
              onChange={(event) => setRecommenderSelectValue(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-line bg-white px-3 py-2 text-sm"
            >
              <option value="">추천인 선택</option>
              {availableRecommenders.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} · {orgNames[candidate.orgUnitCode] ?? candidate.orgUnitCode} · {candidate.position}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addRecommender}
              disabled={!recommenderSelectValue}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="size-4" aria-hidden="true" />
              추가
            </button>
          </div>
          <div className="mt-4 min-h-12 rounded-md bg-slate-50 p-3">
            {selectedRecommenders.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedRecommenders.map((recommender) => (
                  <span
                    key={recommender.id}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink"
                  >
                    <input type="hidden" name="recommenderIds" value={recommender.id} />
                    <span className="truncate">
                      {recommender.name} · {orgNames[recommender.orgUnitCode] ?? recommender.orgUnitCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRecommender(recommender.id)}
                      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted hover:bg-slate-100 hover:text-ink"
                      aria-label={`${recommender.name} 추천인 제거`}
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">선택된 추천인이 없습니다.</p>
            )}
          </div>
        </fieldset>
        <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">공헌 내역은 관련 부서 구성원에게 공개되고 추천을 받을 수 있습니다.</p>
          <button
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-campus px-4 py-2 text-sm font-semibold text-white hover:bg-campus-ink disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Send className="size-4" aria-hidden="true" />
            {isPending ? "제출 중" : "제출"}
          </button>
        </div>
      </form>
      <aside className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <p className="text-sm font-semibold text-muted">산정 미리보기</p>
        <p className="mt-2 text-3xl font-bold text-ink">{tier ? `최대 ${expectedCredit} C` : "Tier 선택 필요"}</p>
        <p className="mt-1 text-sm text-muted">
          승인자가 참여, 성과, 효과 점수를 최종 산정합니다.
        </p>
        <div className="mt-5 overflow-hidden rounded-md border border-line">
          <div className="grid grid-cols-[88px_1fr] border-b border-line bg-slate-50 text-sm">
            <div className="border-r border-line px-3 py-2 font-semibold text-muted">Tier</div>
            <div className="px-3 py-2 font-bold text-ink">{tier || "-"}</div>
          </div>
          <div className="grid grid-cols-[88px_1fr] border-b border-line text-sm">
            <div className="border-r border-line bg-slate-50 px-3 py-2 font-semibold text-muted">라벨</div>
            <div className="px-3 py-2 text-ink">{selectedTierDetail?.label ?? "-"}</div>
          </div>
          <div className="grid grid-cols-[88px_1fr] border-b border-line text-sm">
            <div className="border-r border-line bg-slate-50 px-3 py-2 font-semibold text-muted">의미</div>
            <div className="px-3 py-2 text-ink">{selectedTierDetail?.meaning ?? "-"}</div>
          </div>
          <div className="grid grid-cols-[88px_1fr] border-b border-line text-sm">
            <div className="border-r border-line bg-slate-50 px-3 py-2 font-semibold text-muted">반영</div>
            <div className="px-3 py-2 text-ink">{selectedTierDetail?.appliedTo ?? "-"}</div>
          </div>
          <div className="grid grid-cols-[88px_1fr] text-sm">
            <div className="border-r border-line bg-slate-50 px-3 py-2 font-semibold text-muted">Tier 배수</div>
            <div className="px-3 py-2 font-bold text-campus">{selectedTierDetail ? `x${selectedTierDetail.multiplier}` : "-"}</div>
          </div>
        </div>
        <div className="mt-5 rounded-md bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            {within30Days === undefined ? (
              <AlertCircle className="mt-0.5 size-5 text-slate-500" aria-hidden="true" />
            ) : within30Days ? (
              <CheckCircle2 className="mt-0.5 size-5 text-campus" aria-hidden="true" />
            ) : (
              <AlertCircle className="mt-0.5 size-5 text-amber-600" aria-hidden="true" />
            )}
            <div>
              <p className="font-semibold text-ink">
                {within30Days === undefined ? "활동일 선택 필요" : within30Days ? "입력 가능" : "입력기한 초과"}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                활동일 기준 30일 이내 입력 건은 추천 및 승인 대상으로 이동합니다. 초과 건은 unbillable로 분류합니다.
              </p>
            </div>
          </div>
        </div>
        {actionState.status !== "idle" ? (
          <div
            className={`mt-4 rounded-md border p-4 text-sm font-semibold ${
              actionState.status === "success"
                ? "border-emerald-200 bg-emerald-50 text-campus"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {actionState.message}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
