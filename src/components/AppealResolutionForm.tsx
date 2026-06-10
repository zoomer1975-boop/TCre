"use client";

import { type FormEvent, useActionState } from "react";
import { Gavel, RotateCcw } from "lucide-react";
import { resolveAppealAction } from "@/app/committee/actions";

const initialState = {
  status: "idle" as const,
  message: ""
};

export function AppealResolutionForm({ appealId }: { appealId: string }) {
  const [state, formAction, isPending] = useActionState(resolveAppealAction, initialState);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const decision = submitter instanceof HTMLButtonElement ? submitter.value : "";

    if (decision === "RESOLVED" && !window.confirm("이의신청을 인용해 해당 공헌을 재심의(승인 대기)로 회부하시겠습니까?")) {
      event.preventDefault();
    }

    if (decision === "DISMISSED" && !window.confirm("이의신청을 기각하시겠습니까? 공헌은 반려 상태로 유지됩니다.")) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="mt-3 rounded-md bg-slate-50 p-3">
      <input type="hidden" name="appealId" value={appealId} />
      <label>
        <span className="text-xs font-semibold text-ink">처리 의견</span>
        <textarea
          name="resolution"
          required
          maxLength={1000}
          rows={3}
          className="mt-2 w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm leading-6"
          placeholder="인용 또는 기각 결정의 근거를 입력하세요."
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          name="decision"
          value="RESOLVED"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-campus px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          인용(재심의 회부)
        </button>
        <button
          name="decision"
          value="DISMISSED"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Gavel className="size-4" aria-hidden="true" />
          기각
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
