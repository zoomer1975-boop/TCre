"use client";

import { useActionState } from "react";
import { MessageSquareWarning } from "lucide-react";
import { submitAppealAction } from "@/app/contributions/mine/actions";

const initialState = {
  status: "idle" as const,
  message: ""
};

export function AppealForm({ contributionId }: { contributionId: string }) {
  const [state, formAction, isPending] = useActionState(submitAppealAction, initialState);

  return (
    <form action={formAction} className="mt-4 rounded-md border border-line bg-slate-50 p-3">
      <input type="hidden" name="contributionId" value={contributionId} />
      <label>
        <span className="text-sm font-semibold text-ink">이의신청 사유</span>
        <textarea
          name="reason"
          required
          minLength={10}
          maxLength={1000}
          rows={4}
          className="mt-2 w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm leading-6"
          placeholder="반려 사유에 대한 보완 설명이나 재검토가 필요한 근거를 10자 이상 입력하세요."
        />
      </label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted">접수되면 해당 공헌은 위원회 검토 상태로 전환됩니다.</p>
        <button
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-campus px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          <MessageSquareWarning className="size-4" aria-hidden="true" />
          {isPending ? "접수 중" : "이의신청"}
        </button>
      </div>
      {state.status !== "idle" ? (
        <p className={`mt-3 text-sm font-semibold ${state.status === "success" ? "text-campus" : "text-rose-700"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
