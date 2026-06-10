"use server";

import { getCurrentUser } from "@/lib/providers/identity";
import { isWithinMaxLength, lengthErrorMessage } from "@/lib/security";
import { resolveAppeal, revalidateTcreditPages, updateCommitteeReviewStatus } from "@/lib/server/tcredit-repository";

type CommitteeActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function toFriendlyMessage(error: unknown, fallback: string) {
  return error instanceof Error &&
    (error.message.includes("권한") || error.message.includes("찾을 수 없습니다") || error.message.includes("이미"))
    ? error.message
    : fallback;
}

export async function updateReviewStatusAction(
  _previousState: CommitteeActionState,
  formData: FormData
): Promise<CommitteeActionState> {
  const reviewId = requiredString(formData, "reviewId");
  const status = requiredString(formData, "status");

  if (!reviewId || (status !== "REVIEWING" && status !== "CLOSED")) {
    return { status: "error", message: "심의 상태 변경 정보가 올바르지 않습니다." };
  }

  const user = await getCurrentUser();

  try {
    await updateCommitteeReviewStatus({
      actor: user,
      reviewId,
      status
    });
    revalidateTcreditPages();
    return {
      status: "success",
      message: status === "REVIEWING" ? "심의 검토를 시작했습니다." : "심의 항목을 종결했습니다."
    };
  } catch (error) {
    return { status: "error", message: toFriendlyMessage(error, "심의 상태 변경 중 오류가 발생했습니다.") };
  }
}

export async function resolveAppealAction(
  _previousState: CommitteeActionState,
  formData: FormData
): Promise<CommitteeActionState> {
  const appealId = requiredString(formData, "appealId");
  const decision = requiredString(formData, "decision");
  const resolution = requiredString(formData, "resolution");

  if (!appealId || (decision !== "RESOLVED" && decision !== "DISMISSED")) {
    return { status: "error", message: "이의신청 처리 정보가 올바르지 않습니다." };
  }

  if (!resolution) {
    return { status: "error", message: "처리 의견을 입력해 주세요." };
  }

  if (!isWithinMaxLength(resolution, 1000)) {
    return { status: "error", message: lengthErrorMessage("처리 의견", 1000) };
  }

  const user = await getCurrentUser();

  try {
    await resolveAppeal({
      actor: user,
      appealId,
      decision,
      resolution
    });
    revalidateTcreditPages();
    return {
      status: "success",
      message:
        decision === "RESOLVED"
          ? "이의신청을 인용해 해당 공헌을 재심의(승인 대기)로 회부했습니다."
          : "이의신청을 기각했습니다. 공헌은 반려 상태로 유지됩니다."
    };
  } catch (error) {
    return { status: "error", message: toFriendlyMessage(error, "이의신청 처리 중 오류가 발생했습니다.") };
  }
}
