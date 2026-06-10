"use server";

import { getCurrentUser } from "@/lib/providers/identity";
import { isWithinMaxLength, lengthErrorMessage } from "@/lib/security";
import { submitApproval, revalidateTcreditPages } from "@/lib/server/tcredit-repository";
import { isApprovalDecision, isEffortTier } from "@/lib/domain";

type ApprovalActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function scoreFromForm(formData: FormData, key: string): 0 | 1 {
  return formData.get(key) === "1" ? 1 : 0;
}

export async function submitApprovalAction(
  _previousState: ApprovalActionState,
  formData: FormData
): Promise<ApprovalActionState> {
  const contributionId = requiredString(formData, "contributionId");
  const finalTier = requiredString(formData, "finalTier");
  const decision = requiredString(formData, "decision");
  const comment = requiredString(formData, "comment");

  if (!contributionId || !finalTier || !decision || !comment) {
    return { status: "error", message: "승인/반려 처리에 필요한 값을 모두 입력해 주세요." };
  }

  if (!isEffortTier(finalTier)) {
    return { status: "error", message: "Effort Tier 값이 올바르지 않습니다." };
  }

  if (!isApprovalDecision(decision)) {
    return { status: "error", message: "승인/반려 결정 값이 올바르지 않습니다." };
  }

  if (decision === "REJECTED" && comment.length < 10) {
    return { status: "error", message: "반려 시에는 구체적인 반려 사유를 입력해야 합니다." };
  }

  if (!isWithinMaxLength(comment, 1000)) {
    return { status: "error", message: lengthErrorMessage("승인/반려 의견", 1000) };
  }

  const user = await getCurrentUser();
  let approval;
  try {
    approval = await submitApproval({
      actor: user,
      contributionId,
      inputScore: scoreFromForm(formData, "inputScore"),
      outcomeScore: scoreFromForm(formData, "outcomeScore"),
      impactScore: scoreFromForm(formData, "impactScore"),
      finalTier,
      decision,
      comment
    });
  } catch (error) {
    const message =
      error instanceof Error &&
      (error.message.includes("권한") || error.message.includes("찾을 수 없습니다") || error.message.includes("한도"))
        ? error.message
        : "승인/반려 처리 중 오류가 발생했습니다.";

    return {
      status: "error",
      message
    };
  }
  revalidateTcreditPages();

  return {
    status: "success",
    message:
      decision === "APPROVED"
        ? `승인 완료: ${approval.finalCredit} Credit이 산정되었습니다.`
        : "반려 완료: 반려 사유가 등록되었습니다."
  };
}
