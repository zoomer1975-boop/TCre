"use server";

import { getCurrentUser } from "@/lib/providers/identity";
import { isWithinMaxLength, lengthErrorMessage } from "@/lib/security";
import {
  createAppeal,
  declineRecommendation,
  revalidateTcreditPages,
  submitRecommendationComment
} from "@/lib/server/tcredit-repository";

type RecommendationCommentActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function submitRecommendationCommentAction(
  _previousState: RecommendationCommentActionState,
  formData: FormData
): Promise<RecommendationCommentActionState> {
  const recommendationId = requiredString(formData, "recommendationId");
  const comment = requiredString(formData, "comment");
  const isPrivate = formData.get("isPrivate") === "on";

  if (!recommendationId || !comment) {
    return { status: "error", message: "추천 의견을 입력해 주세요." };
  }

  if (!isWithinMaxLength(comment, 1000)) {
    return { status: "error", message: lengthErrorMessage("추천 의견", 1000) };
  }

  const user = await getCurrentUser();

  try {
    await submitRecommendationComment({
      recommendationId,
      recommenderId: user.id,
      comment,
      isPrivate
    });
    revalidateTcreditPages();
    return { status: "success", message: "추천 의견이 저장되었습니다." };
  } catch {
    return { status: "error", message: "추천 의견을 저장할 권한이 없거나 대상이 없습니다." };
  }
}

export async function declineRecommendationAction(
  _previousState: RecommendationCommentActionState,
  formData: FormData
): Promise<RecommendationCommentActionState> {
  const recommendationId = requiredString(formData, "recommendationId");

  if (!recommendationId) {
    return { status: "error", message: "추천 요청 정보를 찾을 수 없습니다." };
  }

  const user = await getCurrentUser();

  try {
    await declineRecommendation({
      recommendationId,
      recommenderId: user.id
    });
    revalidateTcreditPages();
    return { status: "success", message: "추천 요청을 사양했습니다. 공헌은 승인 단계로 진행됩니다." };
  } catch (error) {
    const message =
      error instanceof Error && (error.message.includes("권한") || error.message.includes("이미"))
        ? error.message
        : "추천 사양 처리 중 오류가 발생했습니다.";

    return { status: "error", message };
  }
}

export async function submitAppealAction(
  _previousState: RecommendationCommentActionState,
  formData: FormData
): Promise<RecommendationCommentActionState> {
  const contributionId = requiredString(formData, "contributionId");
  const reason = requiredString(formData, "reason");

  if (!contributionId || !reason) {
    return { status: "error", message: "이의신청 사유를 입력해 주세요." };
  }

  if (reason.length < 10) {
    return { status: "error", message: "이의신청 사유를 10자 이상 구체적으로 입력해 주세요." };
  }

  if (!isWithinMaxLength(reason, 1000)) {
    return { status: "error", message: lengthErrorMessage("이의신청 사유", 1000) };
  }

  const user = await getCurrentUser();

  try {
    await createAppeal({
      actor: user,
      contributionId,
      reason
    });
    revalidateTcreditPages();
    return { status: "success", message: "이의신청이 접수되었습니다. 위원회 검토 후 결과를 안내합니다." };
  } catch (error) {
    const message =
      error instanceof Error &&
      (error.message.includes("권한") ||
        error.message.includes("본인") ||
        error.message.includes("반려된") ||
        error.message.includes("이미"))
        ? error.message
        : "이의신청 처리 중 오류가 발생했습니다.";

    return { status: "error", message };
  }
}
