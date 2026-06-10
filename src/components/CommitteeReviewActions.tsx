"use client";

import { useActionState } from "react";
import { CheckCheck, SearchCheck } from "lucide-react";
import { updateReviewStatusAction } from "@/app/committee/actions";
import { CommitteeReview } from "@/lib/domain";

const initialState = {
  status: "idle" as const,
  message: ""
};

export function CommitteeReviewActions({
  reviewId,
  reviewStatus
}: {
  reviewId: string;
  reviewStatus: CommitteeReview["status"];
}) {
  const [state, formAction, isPending] = useActionState(updateReviewStatusAction, initialState);

  if (reviewStatus === "CLOSED") {
    return null;
  }

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="reviewId" value={reviewId} />
      <div className="flex flex-wrap gap-2">
        {reviewStatus === "OPEN" ? (
          <button
            name="status"
            value="REVIEWING"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <SearchCheck className="size-4" aria-hidden="true" />
            검토 시작
          </button>
        ) : null}
        <button
          name="status"
          value="CLOSED"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-campus px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          <CheckCheck className="size-4" aria-hidden="true" />
          종결
        </button>
      </div>
      {state.status === "error" ? (
        <p className="mt-2 text-sm font-semibold text-rose-700">{state.message}</p>
      ) : null}
    </form>
  );
}
