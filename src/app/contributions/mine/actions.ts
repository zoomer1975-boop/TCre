"use server";

import { getCurrentUser } from "@/lib/providers/identity";
import { isWithinMaxLength, lengthErrorMessage } from "@/lib/security";
import { revalidateTcreditPages, submitRecommendationComment } from "@/lib/server/tcredit-repository";

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
