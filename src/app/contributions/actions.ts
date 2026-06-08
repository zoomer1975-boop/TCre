"use server";

import { getCurrentUser } from "@/lib/providers/identity";
import { calculateCredit, formatDateInputValue, isContributionType, isEffortTier, resolveInitialStatus } from "@/lib/domain";
import { isWithinMaxLength, lengthErrorMessage } from "@/lib/security";
import { createContribution, revalidateTcreditPages } from "@/lib/server/tcredit-repository";

type ContributionActionState = {
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

function parseDateInputValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export async function createContributionAction(
  _previousState: ContributionActionState,
  formData: FormData
): Promise<ContributionActionState> {
  const title = requiredString(formData, "title");
  const description = requiredString(formData, "description");
  const activityDateValue = requiredString(formData, "activityDate");
  const type = requiredString(formData, "type");
  const relatedOrgUnitCode = requiredString(formData, "relatedOrgUnitCode");
  const requestedTier = requiredString(formData, "requestedTier");

  if (!title || !description || !activityDateValue || !type || !relatedOrgUnitCode || !requestedTier) {
    return { status: "error", message: "필수 입력값을 모두 작성해 주세요." };
  }

  if (!isWithinMaxLength(title, 255)) {
    return { status: "error", message: lengthErrorMessage("공헌 제목", 255) };
  }

  if (!isWithinMaxLength(description, 2000)) {
    return { status: "error", message: lengthErrorMessage("공헌 내용", 2000) };
  }

  if (!isContributionType(type)) {
    return { status: "error", message: "공헌 유형 값이 올바르지 않습니다." };
  }

  if (!isEffortTier(requestedTier)) {
    return { status: "error", message: "Effort Tier 값이 올바르지 않습니다." };
  }

  const activityDate = parseDateInputValue(activityDateValue);
  if (!activityDate) {
    return { status: "error", message: "활동일 형식이 올바르지 않습니다." };
  }

  const submittedAt = new Date();
  if (activityDateValue > formatDateInputValue(submittedAt)) {
    return { status: "error", message: "활동일은 현재 날짜 이후로 선택할 수 없습니다." };
  }

  const inputScore = scoreFromForm(formData, "inputScore");
  const outcomeScore = scoreFromForm(formData, "outcomeScore");
  const impactScore = scoreFromForm(formData, "impactScore");
  const expectedCredit = calculateCredit(inputScore, outcomeScore, impactScore, requestedTier);
  const user = await getCurrentUser();
  const recommenderIds = [
    ...new Set(
      formData
        .getAll("recommenderIds")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
      .filter((value) => value && value !== user.id)
    )
  ];
  const status = resolveInitialStatus(activityDate, submittedAt, recommenderIds.length > 0);

  await createContribution({
    contributorId: user.id,
    title,
    description,
    type,
    activityDate,
    relatedOrgUnitCode,
    status,
    requestedTier,
    expectedCredit,
    submittedWithin30d: status !== "UNBILLABLE",
    recommenderIds
  });
  revalidateTcreditPages();

  return {
    status: "success",
    message:
      status === "UNBILLABLE"
        ? "공헌이 입력기한 초과 상태로 저장되어 unbillable로 분류되었습니다."
        : status === "PENDING_RECOMMEND"
          ? "공헌이 추천 대기 상태로 저장되었습니다."
        : "공헌이 승인 대기 상태로 저장되었습니다."
  };
}
