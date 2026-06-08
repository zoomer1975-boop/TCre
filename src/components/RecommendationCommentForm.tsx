"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { submitRecommendationCommentAction } from "@/app/contributions/mine/actions";

const initialState = {
  status: "idle" as const,
  message: ""
};

export function RecommendationCommentForm({
  recommendationId,
  defaultComment,
  defaultIsPrivate
}: {
  recommendationId: string;
  defaultComment?: string;
  defaultIsPrivate: boolean;
}) {
  const [state, formAction, isPending] = useActionState(submitRecommendationCommentAction, initialState);

  return (
    <form action={formAction} className="mt-4 rounded-md border border-line bg-slate-50 p-3">
      <input type="hidden" name="recommendationId" value={recommendationId} />
      <label>
        <span className="text-sm font-semibold text-ink">추천 의견</span>
        <textarea
          name="comment"
          required
          rows={4}
          defaultValue={defaultComment}
          className="mt-2 w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm leading-6"
          placeholder="공헌 내용에 대한 추천 또는 검토 의견을 입력하세요."
        />
      </label>
      <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <input name="isPrivate" type="checkbox" defaultChecked={defaultIsPrivate} className="size-4 accent-campus" />
        비공개 의견으로 제출
      </label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted">비공개 의견은 승인자와 위원회 검토 자료로만 사용됩니다.</p>
        <button
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-campus px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Send className="size-4" aria-hidden="true" />
          {isPending ? "저장 중" : "의견 저장"}
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
