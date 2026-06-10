"use client";

import { type FormEvent, useActionState, useMemo, useRef, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { submitApprovalAction } from "@/app/approvals/actions";
import {
  Contribution,
  EffortTier,
  Recommendation,
  calculateCredit,
  contributionTypeLabels,
  tierLabels
} from "@/lib/domain";
import { StatusBadge, TextBadge } from "@/components/Badge";

const initialApprovalActionState = {
  status: "idle" as const,
  message: ""
};

export function ApprovalWorkbench({
  contribution,
  recommendations,
  contributorName,
  relatedOrgName,
  recommenderNames
}: {
  contribution: Contribution;
  recommendations: Recommendation[];
  contributorName: string;
  relatedOrgName: string;
  recommenderNames: Record<string, string>;
}) {
  const [actionState, formAction, isPending] = useActionState(submitApprovalAction, initialApprovalActionState);
  const [inputScore, setInputScore] = useState<0 | 1>(1);
  const [outcomeScore, setOutcomeScore] = useState<0 | 1>(1);
  const [impactScore, setImpactScore] = useState<0 | 1>(1);
  const [tier, setTier] = useState<EffortTier>(contribution.requestedTier);
  const [validationError, setValidationError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const finalCredit = useMemo(
    () => calculateCredit(inputScore, outcomeScore, impactScore, tier),
    [impactScore, inputScore, outcomeScore, tier]
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const decision = submitter instanceof HTMLButtonElement ? submitter.value : "";
    const comment = String(new FormData(event.currentTarget).get("comment") ?? "").trim();

    if (decision === "REJECTED" && comment.length < 10) {
      event.preventDefault();
      setValidationError("반려 시에는 반려 사유를 10자 이상 구체적으로 입력해 주세요.");
      return;
    }

    setValidationError("");

    if (decision === "APPROVED" && !window.confirm(`${finalCredit} Credit으로 승인하시겠습니까?`)) {
      event.preventDefault();
    }

    if (decision === "REJECTED" && !window.confirm("반려하시겠습니까?")) {
      event.preventDefault();
    }
  }

  function handleReset() {
    formRef.current?.reset();
    setInputScore(1);
    setOutcomeScore(1);
    setImpactScore(1);
    setTier(contribution.requestedTier);
    setValidationError("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={contribution.status} />
          <TextBadge tone="campus">{contributionTypeLabels[contribution.type]}</TextBadge>
          <TextBadge>{tierLabels[contribution.requestedTier]}</TextBadge>
        </div>
        <h2 className="mt-4 text-xl font-bold text-ink">{contribution.title}</h2>
        <p className="mt-3 leading-7 text-slate-700">{contribution.description}</p>
        <dl className="mt-5 grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-md bg-slate-50 p-3">
            <dt className="text-muted">공헌자</dt>
            <dd className="mt-1 font-semibold text-ink">{contributorName}</dd>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <dt className="text-muted">관련 부서</dt>
            <dd className="mt-1 font-semibold text-ink">{relatedOrgName}</dd>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <dt className="text-muted">활동일</dt>
            <dd className="mt-1 font-semibold text-ink">{contribution.activityDate}</dd>
          </div>
        </dl>
        <div className="mt-6">
          <h3 className="text-sm font-bold text-ink">추천 및 비공개 의견</h3>
          <div className="mt-3 space-y-3">
            {recommendations.length === 0 ? (
              <p className="rounded-md bg-slate-50 p-3 text-sm text-muted">등록된 추천 의견이 없습니다.</p>
            ) : null}
            {recommendations.map((recommendation) => (
              <div key={recommendation.id} className="rounded-md border border-line p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{recommenderNames[recommendation.recommenderId] ?? recommendation.recommenderId}</p>
                  {recommendation.isPrivate ? <TextBadge tone="warning">비공개</TextBadge> : <TextBadge>공개 추천</TextBadge>}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{recommendation.comment ?? "의견 입력 대기"}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <form ref={formRef} className="rounded-lg border border-line bg-white p-5 shadow-soft" action={formAction} onSubmit={handleSubmit}>
        <input type="hidden" name="contributionId" value={contribution.id} />
        <input type="hidden" name="inputScore" value={inputScore} />
        <input type="hidden" name="outcomeScore" value={outcomeScore} />
        <input type="hidden" name="impactScore" value={impactScore} />
        <p className="text-sm font-semibold text-muted">승인 산정</p>
        <p className="mt-2 text-3xl font-bold text-ink">{finalCredit} C</p>
        <div className="mt-5 grid gap-3">
          {[
            ["참여", inputScore, setInputScore],
            ["성과", outcomeScore, setOutcomeScore],
            ["효과", impactScore, setImpactScore]
          ].map(([label, value, setter]) => (
            <label key={label as string} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
              <span className="font-semibold text-ink">{label as string}</span>
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(event) => (setter as (next: 0 | 1) => void)(event.target.checked ? 1 : 0)}
                className="size-4 accent-campus"
              />
            </label>
          ))}
          <label>
            <span className="text-sm font-semibold text-ink">최종 Tier</span>
            <select
              name="finalTier"
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
              value={tier}
              onChange={(event) => setTier(event.target.value as EffortTier)}
            >
              {Object.entries(tierLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {tier !== contribution.requestedTier ? (
              <p className="mt-1.5 text-xs font-semibold text-amber-700">
                요청 {tierLabels[contribution.requestedTier]} → 최종 {tierLabels[tier]} 로 조정됩니다.
              </p>
            ) : null}
          </label>
          <label>
            <span className="text-sm font-semibold text-ink">승인/반려 의견</span>
            <textarea
              required
              name="comment"
              rows={5}
              className="mt-2 w-full resize-y rounded-md border border-line px-3 py-2 text-sm leading-6"
            />
          </label>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <button
            name="decision"
            value="APPROVED"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-campus px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Check className="size-4" aria-hidden="true" />
            승인
          </button>
          <button
            name="decision"
            value="REJECTED"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            <X className="size-4" aria-hidden="true" />
            반려
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-slate-50"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            초기화
          </button>
        </div>
        {validationError ? (
          <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm font-semibold text-rose-700">{validationError}</p>
        ) : null}
        {actionState.status !== "idle" ? (
          <p
            className={`mt-4 rounded-md p-3 text-sm font-semibold ${
              actionState.status === "success" ? "bg-slate-50 text-ink" : "bg-rose-50 text-rose-700"
            }`}
          >
            {actionState.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
